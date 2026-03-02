import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import {
  AbuseReportStatus,
  AuditAction,
  ModerationActionType,
  ModerationTargetType,
} from '@prisma/client';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async banUser(
    targetUserId: string,
    actorId: string,
    actorRole: string,
    reason: string,
    durationSeconds?: number,
  ) {
    const banExpiresAt = durationSeconds
      ? new Date(Date.now() + durationSeconds * 1000)
      : null;

    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: true, banExpiresAt },
    });

    await this.prisma.moderationAction.create({
      data: {
        actorId,
        targetUserId,
        targetType: ModerationTargetType.user,
        targetId: targetUserId,
        action: durationSeconds ? ModerationActionType.timeout : ModerationActionType.ban,
        reason,
        durationSecs: durationSeconds ?? null,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: durationSeconds ? AuditAction.user_timeout : AuditAction.user_ban,
      targetType: 'user',
      targetId: targetUserId,
      payload: { reason, durationSeconds, banExpiresAt },
    });
  }

  async unbanUser(targetUserId: string, actorId: string, actorRole: string) {
    await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isBanned: false, banExpiresAt: null },
    });

    await this.prisma.moderationAction.create({
      data: {
        actorId,
        targetUserId,
        targetType: ModerationTargetType.user,
        targetId: targetUserId,
        action: ModerationActionType.unban,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.user_unban,
      targetType: 'user',
      targetId: targetUserId,
    });
  }

  async pinThread(threadId: string, pinned: boolean, actorId: string, actorRole: string) {
    await this.prisma.thread.update({ where: { id: threadId }, data: { isPinned: pinned } });
    await this.prisma.moderationAction.create({
      data: {
        actorId,
        targetType: ModerationTargetType.thread,
        targetId: threadId,
        action: pinned ? ModerationActionType.pin : ModerationActionType.unpin,
      },
    });
    await this.audit.log({
      actorId,
      actorRole,
      action: pinned ? AuditAction.content_pin : AuditAction.content_restore,
      targetType: 'thread',
      targetId: threadId,
    });
  }

  async lockThread(threadId: string, locked: boolean, actorId: string, actorRole: string) {
    await this.prisma.thread.update({ where: { id: threadId }, data: { isLocked: locked } });
    await this.prisma.moderationAction.create({
      data: {
        actorId,
        targetType: ModerationTargetType.thread,
        targetId: threadId,
        action: ModerationActionType.lock,
      },
    });
    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.content_lock,
      targetType: 'thread',
      targetId: threadId,
    });
  }

  async resolveReport(
    reportId: string,
    resolution: 'actioned' | 'dismissed',
    actorId: string,
    actorRole: string,
    note?: string,
  ) {
    const report = await this.prisma.abuseReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Report not found');

    await this.prisma.abuseReport.update({
      where: { id: reportId },
      data: {
        status: resolution === 'actioned'
          ? AbuseReportStatus.resolved_actioned
          : AbuseReportStatus.resolved_dismissed,
        resolvedBy: actorId,
        resolvedAt: new Date(),
        resolution: note,
      },
    });

    await this.audit.log({
      actorId,
      actorRole,
      action: AuditAction.report_resolve,
      targetType: 'abuse_report',
      targetId: reportId,
      payload: { resolution, note },
    });
  }

  async getModerationQueue(params: {
    type?: 'reports' | 'wiki';
    status?: string;
    limit?: number;
    cursor?: string;
  }) {
    const { type, limit = 50, cursor } = params;

    if (type === 'wiki') {
      return this.prisma.wikiRevision.findMany({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        take: limit,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
        include: {
          page: { select: { id: true, slug: true, title: true } },
          author: { select: { id: true, username: true } },
        },
      });
    }

    return this.prisma.abuseReport.findMany({
      where: { status: AbuseReportStatus.open },
      orderBy: { createdAt: 'asc' },
      take: limit,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      include: {
        reporter: { select: { id: true, username: true } },
      },
    });
  }

  async getModerationHistory(actorId: string, limit = 50) {
    return this.prisma.moderationAction.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
