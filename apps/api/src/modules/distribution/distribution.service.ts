import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CloudTasksService } from '../../infrastructure/cloudtasks/cloudtasks.service';
import { GcsService } from '../../infrastructure/gcs/gcs.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  AuditAction,
  DistributionFormat,
  DistributionJobStatus,
  DistributionPlatform,
  UserRole,
} from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class DistributionService {
  private readonly logger = new Logger(DistributionService.name);
  private anthropic: Anthropic | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudTasks: CloudTasksService,
    private readonly gcs: GcsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  private getAnthropic(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: this.config.get<string>('ANTHROPIC_API_KEY', ''),
      });
    }
    return this.anthropic;
  }

  async createJob(params: {
    episodeId: string;
    requestedBy: string;
    requestedByRole: UserRole;
    targetFormat: DistributionFormat;
    targetPlatform: DistributionPlatform;
    inputAssetId?: string;
  }) {
    const episode = await this.prisma.episode.findUnique({ where: { id: params.episodeId } });
    if (!episode) throw new NotFoundException('Episode not found');

    // Authors can only create jobs for series they own
    if (params.requestedByRole === UserRole.author) {
      const series = await this.prisma.series.findUnique({ where: { id: episode.seriesId } });
      if (series?.createdBy !== params.requestedBy) {
        throw new ForbiddenException('Authors can only distribute their own series');
      }
    }

    const job = await this.prisma.distributionJob.create({
      data: {
        episodeId: params.episodeId,
        requestedBy: params.requestedBy,
        targetFormat: params.targetFormat,
        targetPlatform: params.targetPlatform,
        inputAssetId: params.inputAssetId ?? null,
        status: DistributionJobStatus.pending,
      },
    });

    // Enqueue processing task (non-fatal if queue not configured)
    const queueName = this.config.get<string>('CLOUD_TASKS_DISTRIBUTION_QUEUE', '');
    if (queueName) {
      try {
        await this.cloudTasks.enqueueTask(queueName, {
          url: `/v1/internal/distribution/process/${job.id}`,
          body: { jobId: job.id },
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue distribution task for job ${job.id}: ${err}`);
      }
    } else {
      this.logger.warn(`CLOUD_TASKS_DISTRIBUTION_QUEUE not configured, job ${job.id} created but not enqueued`);
    }

    await this.audit.log({
      actorId: params.requestedBy,
      actorRole: params.requestedByRole,
      action: AuditAction.distribution_job_create,
      targetType: 'distribution_job',
      targetId: job.id,
      payload: { episodeId: params.episodeId, targetFormat: params.targetFormat, targetPlatform: params.targetPlatform },
    });

    return job;
  }

  async processJob(jobId: string) {
    const job = await this.prisma.distributionJob.findUnique({
      where: { id: jobId },
      include: { episode: { include: { series: true } }, inputAsset: true },
    });

    if (!job) return;
    if (job.status !== DistributionJobStatus.pending) return;

    await this.prisma.distributionJob.update({
      where: { id: jobId },
      data: { status: DistributionJobStatus.processing },
    });

    try {
      // 1. Generate AI copy
      const { description, titleVariants, tags, captionPlaceholder } =
        await this.generateAICopy(
          job.episode.title,
          job.episode.description ?? '',
          job.episode.series.title,
          job.targetPlatform,
        );

      // 2. Format conversion (stub — Phase 7 implements actual ffmpeg/transcoder)
      const outputGcsKey = `jobs/${jobId}/video_${job.targetFormat}.mp4`;
      this.logger.log(`[STUB] Format conversion for job ${jobId} → ${outputGcsKey}`);

      // 3. Update job with AI results
      await this.prisma.distributionJob.update({
        where: { id: jobId },
        data: {
          status: DistributionJobStatus.completed,
          completedAt: new Date(),
          outputGcsKey,
          aiDescription: description,
          aiTitleVariants: titleVariants as object,
          aiTags: tags,
          aiCaption: captionPlaceholder,
        },
      });

      await this.audit.log({
        action: AuditAction.distribution_job_complete,
        targetType: 'distribution_job',
        targetId: jobId,
        payload: { outputGcsKey },
      });
    } catch (err) {
      this.logger.error(`Distribution job ${jobId} failed`, err);
      await this.prisma.distributionJob.update({
        where: { id: jobId },
        data: {
          status: DistributionJobStatus.failed,
          errorMessage: err instanceof Error ? err.message : String(err),
        },
      });
    }
  }

  private async generateAICopy(
    episodeTitle: string,
    episodeDescription: string,
    seriesTitle: string,
    platform: DistributionPlatform,
  ) {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY', '');

    if (!apiKey) {
      return {
        description: `Watch ${episodeTitle} from ${seriesTitle}!`,
        titleVariants: [episodeTitle, `${seriesTitle}: ${episodeTitle}`, `[New] ${episodeTitle}`],
        tags: [seriesTitle.toLowerCase().replace(/\s+/g, ''), 'romantasy', 'newrelease'],
        captionPlaceholder: '[Captions to be generated]',
      };
    }

    const platformHints: Record<DistributionPlatform, string> = {
      youtube: 'YouTube video description (300 chars, SEO-optimized, include timestamps if relevant)',
      instagram: 'Instagram caption (150 chars, engaging, with emoji, call to action)',
      tiktok: 'TikTok caption (80 chars, trendy, include relevant hashtags)',
      internal: 'Internal distribution description',
    };

    const prompt = `You are a social media content writer for a romantasy streaming platform called FatedWorld.
Generate content for a new episode release.

Series: "${seriesTitle}"
Episode: "${episodeTitle}"
Description: "${episodeDescription}"
Platform: ${platform} (${platformHints[platform]})

Return a JSON object with exactly these keys:
{
  "description": "platform-appropriate description",
  "titleVariants": ["option 1", "option 2", "option 3"],
  "tags": ["tag1", "tag2"],
  "thumbnailTextSuggestions": ["short text 1", "short text 2", "short text 3"]
}`;

    try {
      const anthropic = this.getAnthropic();
      const response = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        description: parsed.description ?? '',
        titleVariants: parsed.titleVariants ?? [episodeTitle],
        tags: parsed.tags ?? [],
        // Phase 7: replace with Google Cloud Speech-to-Text transcription
        captionPlaceholder: '[Google Cloud Speech-to-Text caption generation — Phase 7]',
      };
    } catch {
      return {
        description: `${episodeTitle} — now streaming on FatedWorld`,
        titleVariants: [episodeTitle],
        tags: ['romantasy', 'fatedworld'],
        captionPlaceholder: '[Caption generation failed]',
      };
    }
  }

  async listJobs(requestedBy: string, role: UserRole, episodeId?: string) {
    const isAdmin = role === UserRole.content_admin || role === UserRole.superadmin;

    return this.prisma.distributionJob.findMany({
      where: {
        ...(!isAdmin && { requestedBy }),
        ...(episodeId && { episodeId }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        episode: { select: { id: true, title: true, seriesId: true } },
      },
      take: 50,
    });
  }

  async getJob(jobId: string, requestedBy: string, role: UserRole) {
    const job = await this.prisma.distributionJob.findUnique({
      where: { id: jobId },
      include: { episode: { select: { id: true, title: true, seriesId: true, series: true } } },
    });

    if (!job) throw new NotFoundException('Job not found');

    const isAdmin = role === UserRole.content_admin || role === UserRole.superadmin;
    if (!isAdmin && job.requestedBy !== requestedBy) {
      throw new ForbiddenException('Not authorized to view this job');
    }

    return job;
  }
}
