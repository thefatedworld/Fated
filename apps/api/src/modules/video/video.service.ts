import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GcsService } from '../../infrastructure/gcs/gcs.service';
import { AuditService } from '../../common/audit/audit.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AssetVersionType, AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class VideoService {
  private readonly logger = new Logger(VideoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gcs: GcsService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly entitlements: EntitlementsService,
  ) {}

  /**
   * Generate a GCS signed upload URL for an episode asset.
   * Admin only. Returns the URL and a pending asset record ID.
   */
  async generateUploadUrl(
    episodeId: string,
    versionType: AssetVersionType = AssetVersionType.main,
    contentType: string,
    actorId: string,
    actorRole: string,
  ): Promise<{ uploadUrl: string; assetId: string; objectKey: string }> {
    const episode = await this.prisma.episode.findUnique({ where: { id: episodeId } });
    if (!episode || episode.isDeleted) throw new NotFoundException('Episode not found');

    const assetId = uuidv4();
    const ext = contentType === 'video/mp4' ? 'mp4' : contentType.split('/')[1] ?? 'bin';
    const objectKey = `episodes/${episodeId}/${versionType}/${assetId}.${ext}`;
    const bucket = this.config.get<string>('GCS_UPLOAD_BUCKET', '');

    const uploadUrl = await this.gcs.generateUploadSignedUrl(bucket, objectKey, contentType);

    // Create pending asset record
    await this.prisma.episodeAsset.create({
      data: {
        id: assetId,
        episodeId,
        versionType,
        gcsBucket: bucket,
        gcsObjectKey: objectKey,
        mimeType: contentType,
        isActive: false, // activated after upload confirmation
        uploadedBy: actorId,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_update,
      targetType: 'episode_asset',
      targetId: assetId,
      payload: { episodeId, versionType, objectKey },
    });

    return { uploadUrl, assetId, objectKey };
  }

  /**
   * Confirm an upload completed — activate the asset, deactivate previous active version of same type.
   */
  async confirmUpload(
    assetId: string,
    fileSizeBytes: number,
    actorId: string,
    actorRole: string,
  ) {
    const asset = await this.prisma.episodeAsset.findUnique({ where: { id: assetId } });
    if (!asset) throw new NotFoundException('Asset not found');

    // Get current version number for this episode + type
    const latestVersion = await this.prisma.episodeAsset.findFirst({
      where: { episodeId: asset.episodeId, versionType: asset.versionType },
      orderBy: { versionNumber: 'desc' },
    });
    const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    // Deactivate previous active version of same type
    await this.prisma.episodeAsset.updateMany({
      where: {
        episodeId: asset.episodeId,
        versionType: asset.versionType,
        isActive: true,
        id: { not: assetId },
      },
      data: { isActive: false },
    });

    // Activate new asset
    const updated = await this.prisma.episodeAsset.update({
      where: { id: assetId },
      data: { isActive: true, fileSizeBytes: BigInt(fileSizeBytes), versionNumber: newVersionNumber },
    });

    // Update episode duration if provided
    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.episode_update,
      targetType: 'episode_asset',
      targetId: assetId,
      payload: { confirmed: true, versionNumber: newVersionNumber, fileSizeBytes },
    });

    return updated;
  }

  /**
   * Generate a signed CDN playback URL.
   * Checks entitlement before issuing URL.
   */
  async generatePlaybackUrl(
    episodeId: string,
    userId: string,
    versionType: AssetVersionType = AssetVersionType.main,
  ): Promise<{ playbackUrl: string; expiresAt: string }> {
    const entitlement = await this.entitlements.checkEntitlement(userId, episodeId);

    if (!entitlement.entitled) {
      throw new ForbiddenException('Not entitled to this episode');
    }

    const asset = await this.prisma.episodeAsset.findFirst({
      where: { episodeId, versionType, isActive: true },
    });

    if (!asset) throw new NotFoundException('No active video asset for this episode');

    const cdnBase = this.config.get<string>('CDN_BASE_URL', '');
    const cdnKeyName = this.config.get<string>('CDN_SIGNING_KEY_NAME', '');
    const cdnSigningKeyB64 = this.config.get<string>('CDN_SIGNING_KEY', '');
    const expiresInSeconds = 4 * 3600; // 4 hours

    let playbackUrl: string;

    if (cdnSigningKeyB64 && cdnBase) {
      const signingKey = Buffer.from(cdnSigningKeyB64, 'base64');
      playbackUrl = this.gcs.generateCdnSignedUrl(
        cdnBase,
        `/${asset.gcsObjectKey}`,
        cdnKeyName,
        signingKey,
        expiresInSeconds,
      );
    } else {
      // Fallback: direct GCS signed URL (local dev)
      playbackUrl = await this.gcs.generateDownloadSignedUrl(
        asset.gcsBucket,
        asset.gcsObjectKey,
        expiresInSeconds,
      );
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    await this.audit.log({
      actorId: userId,
      actorRole: 'user',
      action: AuditAction.playback_url_generate,
      targetType: 'episode',
      targetId: episodeId,
      payload: { assetId: asset.id, versionType, expiresAt },
    });

    return { playbackUrl, expiresAt };
  }
}
