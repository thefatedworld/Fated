import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TokensService } from '../tokens/tokens.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, EntitlementType } from '@prisma/client';

const ENTITLEMENT_CACHE_TTL = 5 * 60; // 5 minutes

export interface EntitlementCheckResult {
  entitled: boolean;
  source: 'episode_unlock' | 'season_pass' | 'free' | 'none';
}

@Injectable()
export class EntitlementsService {
  private readonly logger = new Logger(EntitlementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Hot-path entitlement check with Redis cache.
   * Called on every playback request.
   */
  async checkEntitlement(
    userId: string,
    episodeId: string,
  ): Promise<EntitlementCheckResult> {
    // 1. Check if episode is free
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { isGated: true, seasonId: true },
    });

    if (!episode) return { entitled: false, source: 'none' };
    if (!episode.isGated) return { entitled: true, source: 'free' };

    // 2. Redis cache check
    const cacheKey = `entitlement:${userId}:${episodeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as EntitlementCheckResult;
      return parsed;
    }

    // 3. DB check — direct episode unlock
    const episodeUnlock = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        episodeId,
        type: EntitlementType.episode_unlock,
        revokedAt: null,
      },
    });

    if (episodeUnlock) {
      const result: EntitlementCheckResult = { entitled: true, source: 'episode_unlock' };
      await this.redis.set(cacheKey, JSON.stringify(result), ENTITLEMENT_CACHE_TTL);
      return result;
    }

    // 4. DB check — season pass
    if (episode.seasonId) {
      const seasonPass = await this.prisma.entitlement.findFirst({
        where: {
          userId,
          seasonId: episode.seasonId,
          type: EntitlementType.season_pass,
          revokedAt: null,
        },
      });

      if (seasonPass) {
        const result: EntitlementCheckResult = { entitled: true, source: 'season_pass' };
        await this.redis.set(cacheKey, JSON.stringify(result), ENTITLEMENT_CACHE_TTL);
        return result;
      }
    }

    // Not entitled — cache negative result too (shorter TTL)
    const negResult: EntitlementCheckResult = { entitled: false, source: 'none' };
    await this.redis.set(cacheKey, JSON.stringify(negResult), 60); // 1 min for negative
    return negResult;
  }

  /**
   * Unlock an episode by spending tokens.
   * Fully idempotent — re-unlock returns existing entitlement.
   */
  async unlockEpisode(
    userId: string,
    episodeId: string,
  ): Promise<{ entitlementId: string; tokensSpent: number; newBalance: bigint; wasIdempotent: boolean }> {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      select: { id: true, tokenCost: true, isGated: true, seriesId: true },
    });

    if (!episode) throw new BadRequestException('Episode not found');
    if (!episode.isGated || episode.tokenCost === 0) {
      throw new BadRequestException('Episode does not require tokens to unlock');
    }

    // Idempotency: already unlocked?
    const existing = await this.prisma.entitlement.findFirst({
      where: {
        userId,
        episodeId,
        type: EntitlementType.episode_unlock,
        revokedAt: null,
      },
    });

    if (existing) {
      const balance = await this.tokens.getBalance(userId);
      return {
        entitlementId: existing.id,
        tokensSpent: 0,
        newBalance: balance,
        wasIdempotent: true,
      };
    }

    const idempotencyKey = `unlock_${episodeId}_${userId}`;

    const { ledgerEntryId, newBalance } = await this.tokens.debit({
      userId,
      amount: episode.tokenCost,
      idempotencyKey,
      referenceId: episodeId,
      metadata: { episodeId, seriesId: episode.seriesId },
      actorId: userId,
      actorRole: 'user',
    });

    const entitlement = await this.prisma.entitlement.create({
      data: {
        userId,
        type: EntitlementType.episode_unlock,
        episodeId,
        seriesId: episode.seriesId,
        ledgerEntryId,
      },
    });

    // Invalidate cache
    await this.redis.del(`entitlement:${userId}:${episodeId}`);

    await this.audit.log({
      actorId: userId,
      actorRole: 'user',
      action: AuditAction.entitlement_grant,
      targetType: 'episode',
      targetId: episodeId,
      payload: { type: 'episode_unlock', tokensSpent: episode.tokenCost },
    });

    return {
      entitlementId: entitlement.id,
      tokensSpent: episode.tokenCost,
      newBalance,
      wasIdempotent: false,
    };
  }

  /**
   * Revoke an entitlement (used for refunds).
   */
  async revokeEntitlement(
    entitlementId: string,
    reason: string,
    actorId: string,
    actorRole: string,
  ): Promise<void> {
    const entitlement = await this.prisma.entitlement.findUnique({
      where: { id: entitlementId },
    });

    if (!entitlement || entitlement.revokedAt) return;

    await this.prisma.entitlement.update({
      where: { id: entitlementId },
      data: { revokedAt: new Date(), revokeReason: reason },
    });

    // Invalidate cache
    if (entitlement.episodeId) {
      await this.redis.del(`entitlement:${entitlement.userId}:${entitlement.episodeId}`);
    }

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.entitlement_revoke,
      targetType: 'entitlement',
      targetId: entitlementId,
      payload: { reason, userId: entitlement.userId },
    });
  }

  async getMyEntitlements(userId: string) {
    return this.prisma.entitlement.findMany({
      where: { userId, revokedAt: null },
      include: {
        episode: { select: { id: true, title: true, number: true } },
        season: { select: { id: true, title: true, number: true } },
        series: { select: { id: true, title: true, slug: true } },
      },
      orderBy: { grantedAt: 'desc' },
    });
  }
}
