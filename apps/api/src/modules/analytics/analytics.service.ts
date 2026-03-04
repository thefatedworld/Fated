import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PubSubService } from '../../infrastructure/pubsub/pubsub.service';
import { v4 as uuidv4 } from 'uuid';

export type AnalyticsEventType =
  | 'playback.start'
  | 'playback.progress'
  | 'playback.pause'
  | 'playback.seek'
  | 'playback.end'
  | 'playback.buffer'
  | 'token.purchased'
  | 'token.unlocked'
  | 'community.thread_created'
  | 'community.reply_created'
  | 'community.vote'
  | 'community.wiki_edit_submitted'
  | 'community.wiki_edit_approved'
  | 'user.registered'
  | 'user.login'
  | 'user.series_view'
  | 'user.episode_view';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  userId?: string;
  sessionId?: string;
  episodeId?: string;
  seriesId?: string;
  properties?: Record<string, unknown>;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pubSub: PubSubService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Ingest an analytics event — publish to Pub/Sub for BigQuery ingestion.
   * Fire-and-forget: errors logged but not re-thrown.
   */
  async track(event: AnalyticsEvent): Promise<void> {
    const topic = this.config.get<string>('PUBSUB_ANALYTICS_TOPIC', '');
    if (!topic) return;

    try {
      await this.pubSub.publish(topic, {
        event_id: uuidv4(),
        event_type: event.eventType,
        user_id: event.userId,
        session_id: event.sessionId,
        episode_id: event.episodeId,
        series_id: event.seriesId,
        timestamp: new Date().toISOString(),
        properties: event.properties ?? {},
      });
    } catch (err) {
      // Analytics failure must never break the main flow
      this.logger.error('Failed to publish analytics event', err);
    }
  }

  /**
   * Get author analytics for a series (from pre-aggregated Postgres snapshots).
   */
  async getAuthorSeriesAnalytics(seriesId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await this.prisma.analyticsDailySnapshot.findMany({
      where: {
        seriesId,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
    });

    const totals = snapshots.reduce(
      (acc, s) => ({
        totalViews: acc.totalViews + s.totalViews,
        totalWatchMinutes: acc.totalWatchMinutes + s.totalWatchMinutes,
        tokensSold: acc.tokensSold + s.tokensSold,
        unlocks: acc.unlocks + s.unlocks,
      }),
      { totalViews: 0, totalWatchMinutes: BigInt(0), tokensSold: BigInt(0), unlocks: 0 },
    );

    return {
      seriesId,
      period: `${days}d`,
      dailySnapshots: snapshots.map((s) => ({
        date: s.date,
        views: s.totalViews,
        watchMinutes: s.totalWatchMinutes.toString(),
        tokensSold: s.tokensSold.toString(),
        unlocks: s.unlocks,
        completionRate: s.completionRate,
      })),
      totals: {
        views: totals.totalViews,
        watchMinutes: totals.totalWatchMinutes.toString(),
        tokensSold: totals.tokensSold.toString(),
        unlocks: totals.unlocks,
      },
    };
  }

  /**
   * Admin: get platform-wide KPI snapshot.
   */
  async getPlatformSnapshot(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await this.prisma.analyticsDailySnapshot.findMany({
      where: { seriesId: null, date: { gte: since } },
      orderBy: { date: 'desc' },
    });

    return snapshots.map((s) => ({
      date: s.date,
      newUsers: s.newUsers,
      totalViews: s.totalViews,
      totalWatchMinutes: s.totalWatchMinutes.toString(),
      tokensSold: s.tokensSold.toString(),
      unlocks: s.unlocks,
      completionRate: s.completionRate,
    }));
  }

  /**
   * Admin: community engagement + wiki + moderation stats for a time range.
   */
  async getCommunityStats(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const priorStart = new Date(since);
    priorStart.setDate(priorStart.getDate() - days);

    const [
      threadsCreated,
      threadsCreatedPrior,
      repliesPosted,
      repliesPostedPrior,
      communityVotes,
      communityVotesPrior,
      wikiEditsSubmitted,
      wikiEditsSubmittedPrior,
      wikiEditsApproved,
      wikiEditsRejected,
      wikiEditsPending,
      wikiPagesCreated,
      openReports,
      underReviewReports,
      topThreads,
    ] = await Promise.all([
      this.prisma.thread.count({ where: { createdAt: { gte: since }, isDeleted: false } }),
      this.prisma.thread.count({ where: { createdAt: { gte: priorStart, lt: since }, isDeleted: false } }),
      this.prisma.threadReply.count({ where: { createdAt: { gte: since }, isDeleted: false } }),
      this.prisma.threadReply.count({ where: { createdAt: { gte: priorStart, lt: since }, isDeleted: false } }),
      this.prisma.vote.count({ where: { createdAt: { gte: since } } }),
      this.prisma.vote.count({ where: { createdAt: { gte: priorStart, lt: since } } }),
      this.prisma.wikiRevision.count({ where: { createdAt: { gte: since } } }),
      this.prisma.wikiRevision.count({ where: { createdAt: { gte: priorStart, lt: since } } }),
      this.prisma.wikiRevision.count({ where: { createdAt: { gte: since }, status: 'approved' } }),
      this.prisma.wikiRevision.count({ where: { createdAt: { gte: since }, status: 'rejected' } }),
      this.prisma.wikiRevision.count({ where: { status: 'pending' } }),
      this.prisma.wikiPage.count({ where: { createdAt: { gte: since } } }),
      this.prisma.abuseReport.count({ where: { status: 'open' } }),
      this.prisma.abuseReport.count({ where: { status: 'under_review' } }),
      this.prisma.thread.findMany({
        where: { createdAt: { gte: since }, isDeleted: false },
        orderBy: { voteCount: 'desc' },
        take: 5,
        include: {
          series: { select: { id: true, title: true } },
          _count: { select: { replies: true } },
        },
      }),
    ]);

    return {
      community: {
        threadsCreated,
        threadsCreatedPrior,
        repliesPosted,
        repliesPostedPrior,
        communityVotes,
        communityVotesPrior,
        wikiEditsSubmitted,
        wikiEditsSubmittedPrior,
      },
      wiki: {
        pagesCreated: wikiPagesCreated,
        editsApproved: wikiEditsApproved,
        editsRejected: wikiEditsRejected,
        editsPending: wikiEditsPending,
      },
      moderation: {
        openReports,
        underReviewReports,
      },
      topThreads: topThreads.map((t) => ({
        id: t.id,
        title: t.title,
        seriesTitle: t.series?.title ?? null,
        seriesId: t.series?.id ?? null,
        voteCount: t.voteCount,
        replyCount: t._count.replies,
        createdAt: t.createdAt,
      })),
    };
  }

  /**
   * Admin: trending series ranked by views in the period.
   */
  async getTrendingSeries(days = 7) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await this.prisma.analyticsDailySnapshot.findMany({
      where: { seriesId: { not: null }, date: { gte: since } },
    });

    const seriesMap = new Map<string, { views: number; unlocks: number; watchMinutes: number }>();
    for (const s of snapshots) {
      const id = s.seriesId!;
      const existing = seriesMap.get(id) ?? { views: 0, unlocks: 0, watchMinutes: 0 };
      existing.views += s.totalViews;
      existing.unlocks += s.unlocks;
      existing.watchMinutes += Number(s.totalWatchMinutes);
      seriesMap.set(id, existing);
    }

    const ranked = Array.from(seriesMap.entries())
      .map(([seriesId, stats]) => ({ seriesId, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    if (ranked.length === 0) return [];

    const seriesDetails = await this.prisma.series.findMany({
      where: { id: { in: ranked.map((r) => r.seriesId) } },
      select: { id: true, title: true, genreTags: true, coverImageUrl: true },
    });

    const detailMap = new Map(seriesDetails.map((s) => [s.id, s]));

    return ranked.map((r) => {
      const detail = detailMap.get(r.seriesId);
      return {
        seriesId: r.seriesId,
        title: detail?.title ?? 'Unknown',
        genreTags: detail?.genreTags ?? [],
        views: r.views,
        unlocks: r.unlocks,
        watchMinutes: r.watchMinutes,
      };
    });
  }
}
