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

    return snapshots;
  }
}
