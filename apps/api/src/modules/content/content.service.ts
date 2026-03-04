import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { CloudTasksService } from '../../infrastructure/cloudtasks/cloudtasks.service';
import { PubSubService } from '../../infrastructure/pubsub/pubsub.service';
import { CreateSeriesDto } from './dto/create-series.dto';
import { CreateEpisodeDto } from './dto/create-episode.dto';
import { UpdateEpisodeDto } from './dto/update-episode.dto';
import { AuditAction, EpisodeStatus, SeriesStatus } from '@prisma/client';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly cloudTasks: CloudTasksService,
    private readonly pubSub: PubSubService,
    private readonly config: ConfigService,
  ) {}

  // ── SERIES ──────────────────────────────────

  async createSeries(dto: CreateSeriesDto, actorId: string, actorRole: string) {
    const slug = dto.slug ?? generateSlug(dto.title);

    const existing = await this.prisma.series.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`Slug "${slug}" already in use`);

    const series = await this.prisma.series.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description,
        genreTags: dto.genreTags ?? [],
        coverImageUrl: dto.coverImageUrl,
        createdBy: actorId,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_create,
      targetType: 'series',
      targetId: series.id,
      payload: { title: series.title, slug: series.slug },
    });

    return series;
  }

  async updateSeries(
    seriesId: string,
    data: Partial<CreateSeriesDto>,
    actorId: string,
    actorRole: string,
  ) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.isDeleted) throw new NotFoundException('Series not found');

    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.genreTags && { genreTags: data.genreTags }),
        ...(data.coverImageUrl !== undefined && { coverImageUrl: data.coverImageUrl }),
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_update,
      targetType: 'series',
      targetId: seriesId,
      payload: data as Record<string, unknown>,
    });

    return updated;
  }

  async publishSeries(seriesId: string, actorId: string, actorRole: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.isDeleted) throw new NotFoundException('Series not found');

    const updated = await this.prisma.series.update({
      where: { id: seriesId },
      data: { status: SeriesStatus.published },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_update,
      targetType: 'series',
      targetId: seriesId,
      payload: { status: 'published' },
    });

    return updated;
  }

  async softDeleteSeries(seriesId: string, actorId: string, actorRole: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series) throw new NotFoundException('Series not found');

    await this.prisma.series.update({
      where: { id: seriesId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: SeriesStatus.removed,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_delete,
      targetType: 'series',
      targetId: seriesId,
    });
  }

  async restoreSeries(seriesId: string, actorId: string, actorRole: string) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || !series.isDeleted) throw new NotFoundException('Series not found or not deleted');

    await this.prisma.series.update({
      where: { id: seriesId },
      data: { isDeleted: false, deletedAt: null, status: SeriesStatus.draft },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_restore,
      targetType: 'series',
      targetId: seriesId,
    });
  }

  async listSeries(includeUnpublished = false) {
    return this.prisma.series.findMany({
      where: {
        isDeleted: false,
        ...(!includeUnpublished && { status: SeriesStatus.published }),
      },
      orderBy: { createdAt: 'desc' },
      include: { seasons: { orderBy: { number: 'asc' } } },
    });
  }

  async getSeriesById(seriesId: string) {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
      include: {
        seasons: {
          orderBy: { number: 'asc' },
          include: {
            episodes: {
              where: { isDeleted: false },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!series || series.isDeleted) throw new NotFoundException('Series not found');
    return series;
  }

  // ── EPISODES ────────────────────────────────

  async createEpisode(
    seriesId: string,
    dto: CreateEpisodeDto,
    actorId: string,
    actorRole: string,
  ) {
    const series = await this.prisma.series.findUnique({ where: { id: seriesId } });
    if (!series || series.isDeleted) throw new NotFoundException('Series not found');

    // Auto-assign episode number
    const lastEpisode = await this.prisma.episode.findFirst({
      where: { seriesId, isDeleted: false },
      orderBy: { number: 'desc' },
    });
    const episodeNumber = (lastEpisode?.number ?? 0) + 1;

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : undefined;
    const status = scheduledAt && scheduledAt > new Date()
      ? EpisodeStatus.scheduled
      : EpisodeStatus.draft;

    const episode = await this.prisma.episode.create({
      data: {
        seriesId,
        seasonId: dto.seasonId ?? null,
        number: episodeNumber,
        title: dto.title,
        description: dto.description,
        isGated: dto.isGated ?? false,
        tokenCost: dto.tokenCost ?? 0,
        status,
        scheduledAt,
        sortOrder: dto.sortOrder ?? episodeNumber,
      },
    });

    if (scheduledAt && status === EpisodeStatus.scheduled) {
      await this.scheduleEpisodePublish(episode.id, scheduledAt);
    }

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_create,
      targetType: 'episode',
      targetId: episode.id,
      payload: { title: episode.title, seriesId, status },
    });

    return episode;
  }

  async updateEpisode(
    episodeId: string,
    dto: UpdateEpisodeDto,
    actorId: string,
    actorRole: string,
  ) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.isDeleted) throw new NotFoundException('Episode not found');

    const updated = await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isGated !== undefined && { isGated: dto.isGated }),
        ...(dto.tokenCost !== undefined && { tokenCost: dto.tokenCost }),
        ...(dto.durationSeconds !== undefined && { durationSeconds: dto.durationSeconds }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_update,
      targetType: 'episode',
      targetId: episodeId,
      payload: dto as Record<string, unknown>,
    });

    return updated;
  }

  async publishEpisode(episodeId: string, actorId: string, actorRole: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.isDeleted) throw new NotFoundException('Episode not found');

    const updated = await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        status: EpisodeStatus.published,
        publishedAt: new Date(),
      },
    });

    // Publish event to Pub/Sub — triggers notifications
    const pubsubTopic = this.config.get<string>('PUBSUB_EPISODE_PUBLISHED_TOPIC', '');
    await this.pubSub.publish(pubsubTopic, {
      episodeId: episode.id,
      seriesId: episode.seriesId,
      title: episode.title,
      publishedAt: new Date().toISOString(),
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_publish,
      targetType: 'episode',
      targetId: episodeId,
    });

    return updated;
  }

  async scheduleEpisode(
    episodeId: string,
    scheduledAt: Date,
    actorId: string,
    actorRole: string,
  ) {
    if (scheduledAt <= new Date()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.isDeleted) throw new NotFoundException('Episode not found');

    // Delete old task if rescheduling
    const oldTaskName = `episode-publish-${episodeId}`;
    const queueName = this.config.get<string>('CLOUD_TASKS_EPISODE_PUBLISH_QUEUE', '');
    await this.cloudTasks.deleteTask(queueName, oldTaskName);

    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { status: EpisodeStatus.scheduled, scheduledAt },
    });

    await this.scheduleEpisodePublish(episodeId, scheduledAt);

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_schedule,
      targetType: 'episode',
      targetId: episodeId,
      payload: { scheduledAt: scheduledAt.toISOString() },
    });
  }

  private async scheduleEpisodePublish(episodeId: string, scheduledAt: Date) {
    const queueName = this.config.get<string>('CLOUD_TASKS_EPISODE_PUBLISH_QUEUE', '');
    await this.cloudTasks.enqueueTask(queueName, {
      url: `/v1/internal/episodes/${episodeId}/publish`,
      body: { episodeId },
      scheduleTime: scheduledAt,
      taskName: `episode-publish-${episodeId}`,
    });
  }

  async softDeleteEpisode(episodeId: string, actorId: string, actorRole: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode) throw new NotFoundException('Episode not found');

    await this.prisma.episode.update({
      where: { id: episodeId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        status: EpisodeStatus.removed,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_delete,
      targetType: 'episode',
      targetId: episodeId,
    });
  }

  async restoreEpisode(episodeId: string, actorId: string, actorRole: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || !episode.isDeleted) throw new NotFoundException('Episode not found or not deleted');

    await this.prisma.episode.update({
      where: { id: episodeId },
      data: { isDeleted: false, deletedAt: null, status: EpisodeStatus.draft },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_restore,
      targetType: 'episode',
      targetId: episodeId,
    });
  }

  async listSeasons(seriesId: string) {
    return this.prisma.season.findMany({
      where: { seriesId },
      orderBy: { number: 'asc' },
    });
  }

  async createSeason(
    seriesId: string,
    data: { title: string; number: number; arcLabel?: string },
    actorId: string,
    actorRole: string,
  ) {
    const series = await this.prisma.series.findUnique({
      where: { id: seriesId },
    });
    if (!series) throw new Error('Series not found');

    const maxSort = await this.prisma.season.count({ where: { seriesId } });

    const season = await this.prisma.season.create({
      data: {
        seriesId,
        number: data.number,
        title: data.title,
        arcLabel: data.arcLabel ?? `Season ${data.number}`,
        sortOrder: maxSort,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.series_update,
      targetType: 'season',
      targetId: season.id,
    });

    return season;
  }

  async listEpisodes(seriesId: string, includeUnpublished = false) {
    return this.prisma.episode.findMany({
      where: {
        seriesId,
        isDeleted: false,
        ...(!includeUnpublished && { status: EpisodeStatus.published }),
      },
      orderBy: { sortOrder: 'asc' },
      include: {
        assets: {
          where: { isActive: true },
          select: {
            id: true,
            versionType: true,
            versionNumber: true,
            mimeType: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async getEpisodeById(episodeId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: {
        assets: { where: { isActive: true } },
        season: true,
      },
    });
    if (!episode || episode.isDeleted) throw new NotFoundException('Episode not found');
    return episode;
  }

  // ── INTERNAL TASK HANDLER ────────────────────

  async handleScheduledPublish(episodeId: string) {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.isDeleted) return;
    if (episode.status !== EpisodeStatus.scheduled) return;

    await this.publishEpisode(episodeId, 'system', 'system');
    this.logger.log(`Scheduled publish executed for episode ${episodeId}`);
  }
}
