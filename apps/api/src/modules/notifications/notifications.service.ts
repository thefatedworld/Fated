import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CloudTasksService } from '../../infrastructure/cloudtasks/cloudtasks.service';
import * as admin from 'firebase-admin';
import { App, getApps, initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

type NotificationType =
  | 'episode_drop'
  | 'countdown_24h'
  | 'countdown_1h'
  | 'community_reply'
  | 'author_qa_live'
  | 'wiki_approved';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseApp: App | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudTasks: CloudTasksService,
    private readonly config: ConfigService,
  ) {}

  private getFirebaseApp(): App {
    if (this.firebaseApp) return this.firebaseApp;

    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID', '');
    const existingApp = getApps().find((a) => a.name === projectId);

    if (existingApp) {
      this.firebaseApp = existingApp;
    } else {
      this.firebaseApp = initializeApp(
        { projectId },
        projectId,
      );
    }

    return this.firebaseApp;
  }

  /**
   * Send push notification to all active devices for a set of user IDs.
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload,
    notificationType: NotificationType,
    idempotencyKey?: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    // Filter by preferences
    const prefs = await this.prisma.notificationPreference.findMany({
      where: {
        userId: { in: userIds },
        ...(notificationType === 'episode_drop' && { episodeDrops: false }),
        ...(notificationType === 'countdown_24h' && { countdownReminders: false }),
        ...(notificationType === 'countdown_1h' && { countdownReminders: false }),
        ...(notificationType === 'community_reply' && { communityReplies: false }),
        ...(notificationType === 'author_qa_live' && { authorQa: false }),
      },
    });
    const optedOutIds = new Set(prefs.map((p) => p.userId));
    const eligibleIds = userIds.filter((id) => !optedOutIds.has(id));

    if (eligibleIds.length === 0) return;

    // Get active FCM tokens
    const tokens = await this.prisma.pushToken.findMany({
      where: { userId: { in: eligibleIds }, isActive: true },
      select: { id: true, fcmToken: true, userId: true },
    });

    if (tokens.length === 0) return;

    const messaging = getMessaging(this.getFirebaseApp());
    const fcmTokens = tokens.map((t) => t.fcmToken);

    // FCM multicast max 500 per request
    const batches = [];
    for (let i = 0; i < fcmTokens.length; i += 500) {
      batches.push(fcmTokens.slice(i, i + 500));
    }

    for (const batch of batches) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          notification: {
            title: payload.title,
            body: payload.body,
            imageUrl: payload.imageUrl,
          },
          data: payload.data,
          apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
          },
          android: {
            priority: 'high',
          },
        });

        // Deactivate invalid tokens
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(batch[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await this.prisma.pushToken.updateMany({
            where: { fcmToken: { in: invalidTokens } },
            data: { isActive: false },
          });
        }
      } catch (err) {
        this.logger.error('FCM multicast failed', err);
      }
    }
  }

  /**
   * Schedule episode countdown notifications via Cloud Tasks.
   */
  async scheduleEpisodeCountdowns(episodeId: string, scheduledAt: Date) {
    const queueName = this.config.get<string>('CLOUD_TASKS_NOTIFICATION_QUEUE', '');

    // 24h reminder
    const remind24h = new Date(scheduledAt.getTime() - 24 * 3600 * 1000);
    if (remind24h > new Date()) {
      await this.cloudTasks.enqueueTask(queueName, {
        url: `/v1/internal/notifications/episode-countdown`,
        body: { episodeId, type: 'countdown_24h' },
        scheduleTime: remind24h,
        taskName: `notif-countdown-24h-${episodeId}`,
      });
    }

    // 1h reminder
    const remind1h = new Date(scheduledAt.getTime() - 3600 * 1000);
    if (remind1h > new Date()) {
      await this.cloudTasks.enqueueTask(queueName, {
        url: `/v1/internal/notifications/episode-countdown`,
        body: { episodeId, type: 'countdown_1h' },
        scheduleTime: remind1h,
        taskName: `notif-countdown-1h-${episodeId}`,
      });
    }
  }

  /**
   * Cancel episode countdown notifications (when episode is rescheduled).
   */
  async cancelEpisodeCountdowns(episodeId: string) {
    const queueName = this.config.get<string>('CLOUD_TASKS_NOTIFICATION_QUEUE', '');
    await Promise.all([
      this.cloudTasks.deleteTask(queueName, `notif-countdown-24h-${episodeId}`),
      this.cloudTasks.deleteTask(queueName, `notif-countdown-1h-${episodeId}`),
    ]);
  }

  /**
   * Cloud Tasks callback: send episode countdown push notifications.
   */
  async handleEpisodeCountdown(episodeId: string, type: 'countdown_24h' | 'countdown_1h') {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { series: { select: { id: true, title: true } } },
    });
    if (!episode) return;

    const timeLabel = type === 'countdown_24h' ? '24 hours' : '1 hour';
    const payload: NotificationPayload = {
      title: `New episode dropping in ${timeLabel}!`,
      body: `${episode.title} from ${episode.series.title} is almost here.`,
      data: { episodeId, seriesId: episode.seriesId, type },
    };

    // Get all users who have the series in their history (simplified: all users with push tokens)
    // TODO Phase 5: refine to users who have watched this series
    const allUserTokens = await this.prisma.pushToken.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    const userIds = allUserTokens.map((t) => t.userId);

    await this.sendToUsers(userIds, payload, type);
  }

  /**
   * Cloud Tasks callback: send episode drop notifications.
   */
  async handleEpisodeDrop(episodeId: string, seriesId: string) {
    const episode = await this.prisma.episode.findUnique({
      where: { id: episodeId },
      include: { series: { select: { id: true, title: true } } },
    });
    if (!episode) return;

    const payload: NotificationPayload = {
      title: `New episode of ${episode.series.title}!`,
      body: `${episode.title} is now available.`,
      data: { episodeId, seriesId, type: 'episode_drop' },
    };

    const allUserTokens = await this.prisma.pushToken.findMany({
      where: { isActive: true },
      select: { userId: true },
      distinct: ['userId'],
    });
    const userIds = allUserTokens.map((t) => t.userId);

    await this.sendToUsers(userIds, payload, 'episode_drop', `episode_drop_${episodeId}`);
  }
}
