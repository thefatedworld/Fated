import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Generate user data export bundle.
   * Returns structured data — caller is responsible for writing to GCS + generating signed URL.
   */
  async generateExport(userId: string): Promise<Record<string, unknown>> {
    const [user, wallet, ledger, entitlements, iapTransactions, threads, replies, wikiRevisions, notifPrefs] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            username: true,
            displayName: true,
            email: true,
            bio: true,
            role: true,
            isVerifiedAuthor: true,
            createdAt: true,
          },
        }),
        this.prisma.tokenWallet.findUnique({ where: { userId }, select: { balance: true } }),
        this.prisma.tokenLedgerEntry.findMany({
          where: { userId, type: 'iap_purchase' },
          select: { createdAt: true, metadata: true, amount: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.entitlement.findMany({
          where: { userId, revokedAt: null },
          include: {
            episode: { select: { title: true, number: true } },
            season: { select: { title: true, number: true } },
            series: { select: { title: true } },
          },
          orderBy: { grantedAt: 'desc' },
        }),
        this.prisma.iAPTransaction.findMany({
          where: { userId },
          select: {
            createdAt: true,
            productId: true,
            tokenAmount: true,
            platform: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.thread.findMany({
          where: { authorId: userId, isDeleted: false },
          select: { title: true, body: true, type: true, createdAt: true },
          take: 500,
        }),
        this.prisma.threadReply.findMany({
          where: { authorId: userId, isDeleted: false },
          select: { body: true, createdAt: true },
          take: 500,
        }),
        this.prisma.wikiRevision.findMany({
          where: { authorId: userId },
          include: { page: { select: { title: true } } },
          select: { page: { select: { title: true } }, versionNum: true, status: true, createdAt: true },
          take: 200,
        }),
        this.prisma.notificationPreference.findUnique({ where: { userId } }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: user,
      tokens: {
        currentBalance: wallet?.balance.toString() ?? '0',
        purchaseHistory: iapTransactions.map((t) => ({
          date: t.createdAt,
          productId: t.productId,
          tokensReceived: t.tokenAmount,
          platform: t.platform,
          status: t.status,
        })),
      },
      entitlements: entitlements.map((e) => ({
        type: e.type,
        series: e.series?.title,
        season: e.season ? `Season ${e.season.number}` : null,
        episode: e.episode ? `Ep ${e.episode.number}: ${e.episode.title}` : null,
        grantedAt: e.grantedAt,
      })),
      community: {
        threads: threads.map((t) => ({ title: t.title, type: t.type, createdAt: t.createdAt })),
        replies: replies.map((r) => ({ createdAt: r.createdAt })),
        wikiContributions: wikiRevisions.map((r) => ({
          pageTitle: r.page.title,
          version: r.versionNum,
          status: r.status,
          submittedAt: r.createdAt,
        })),
      },
      settings: {
        notificationPreferences: notifPrefs,
      },
    };
  }

  /**
   * Soft deactivate account.
   */
  async deactivateAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isBanned: true },
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.user_delete,
      targetType: 'user',
      targetId: userId,
      payload: { deactivationType: 'soft' },
    });
  }

  /**
   * Hard delete (GDPR) — anonymize PII after 30-day grace period.
   * Retains financial records and audit logs per retention policy.
   */
  async hardDeleteAccount(userId: string) {
    const hashedId = `DELETED_${Buffer.from(userId).toString('base64').substring(0, 12)}`;

    await this.prisma.$transaction(async (tx) => {
      // Anonymize PII
      await tx.user.update({
        where: { id: userId },
        data: {
          email: `${hashedId}@deleted.invalid`,
          username: hashedId.toLowerCase(),
          displayName: 'Deleted User',
          passwordHash: null,
          avatarUrl: null,
          bio: null,
          deletedAt: new Date(),
          isBanned: true,
        },
      });

      // Anonymize thread content
      await tx.thread.updateMany({
        where: { authorId: userId },
        data: { body: '[content removed]' },
      });

      // Deactivate push tokens
      await tx.pushToken.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      // Revoke all refresh tokens
      await tx.refreshToken.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.user_delete,
      targetType: 'user',
      targetId: userId,
      payload: { deactivationType: 'hard_delete' },
    });
  }
}
