import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { AuditService } from '../../common/audit/audit.service';
import { AuditAction, LedgerEntryType, Prisma } from '@prisma/client';

const IDEMPOTENCY_CACHE_TTL = 10 * 60; // 10 minutes

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async getBalance(userId: string): Promise<bigint> {
    const wallet = await this.prisma.tokenWallet.findUnique({ where: { userId } });
    return wallet?.balance ?? BigInt(0);
  }

  async getLedgerHistory(userId: string, limit = 50, cursor?: string) {
    return this.prisma.tokenLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        amount: true,
        balanceAfter: true,
        type: true,
        referenceId: true,
        createdAt: true,
        metadata: true,
      },
    });
  }

  /**
   * Credit tokens to a user's wallet (e.g., after IAP purchase).
   * Fully idempotent — duplicate calls with same idempotency key return existing entry.
   */
  async credit(params: {
    userId: string;
    amount: number;
    type: LedgerEntryType;
    idempotencyKey: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
    actorId?: string;
    actorRole?: string;
  }): Promise<{ ledgerEntryId: string; newBalance: bigint; wasIdempotent: boolean }> {
    if (params.amount <= 0) {
      throw new BadRequestException('Credit amount must be positive');
    }

    // Fast idempotency check in Redis
    const redisCacheKey = `idem:${params.idempotencyKey}`;
    const cached = await this.redis.get(redisCacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      return { ledgerEntryId: entry.id, newBalance: BigInt(entry.balanceAfter), wasIdempotent: true };
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          // DB-level idempotency check (UNIQUE constraint on idempotency_key)
          const existing = await tx.tokenLedgerEntry.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          });

          if (existing) {
            return { entry: existing, wasIdempotent: true };
          }

          const wallet = await tx.tokenWallet.findUniqueOrThrow({
            where: { userId: params.userId },
          });

          const newBalance = wallet.balance + BigInt(params.amount);

          const entry = await tx.tokenLedgerEntry.create({
            data: {
              userId: params.userId,
              amount: BigInt(params.amount),
              balanceAfter: newBalance,
              type: params.type,
              referenceId: params.referenceId,
              idempotencyKey: params.idempotencyKey,
              metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
              createdBy: params.actorId,
            },
          });

          await tx.tokenWallet.update({
            where: { userId: params.userId },
            data: { balance: newBalance },
          });

          return { entry, wasIdempotent: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      // Cache in Redis for dedup window
      await this.redis.set(
        redisCacheKey,
        JSON.stringify({ id: result.entry.id, balanceAfter: result.entry.balanceAfter.toString() }),
        IDEMPOTENCY_CACHE_TTL,
      );

      if (!result.wasIdempotent) {
        await this.audit.log({
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: params.type === LedgerEntryType.iap_purchase
            ? AuditAction.token_credit
            : AuditAction.token_admin_adjustment,
          targetType: 'user',
          targetId: params.userId,
          payload: {
            amount: params.amount,
            type: params.type,
            referenceId: params.referenceId,
          },
        });
      }

      return {
        ledgerEntryId: result.entry.id,
        newBalance: result.entry.balanceAfter,
        wasIdempotent: result.wasIdempotent,
      };
    } catch (err) {
      // Handle unique constraint violation (race condition — second request beat us)
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.tokenLedgerEntry.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existing) {
          return {
            ledgerEntryId: existing.id,
            newBalance: existing.balanceAfter,
            wasIdempotent: true,
          };
        }
      }
      throw err;
    }
  }

  /**
   * Debit tokens from a user's wallet (e.g., unlock).
   * Validates sufficient balance. Fully idempotent.
   */
  async debit(params: {
    userId: string;
    amount: number;
    idempotencyKey: string;
    referenceId?: string;
    metadata?: Record<string, unknown>;
    actorId?: string;
    actorRole?: string;
  }): Promise<{ ledgerEntryId: string; newBalance: bigint; wasIdempotent: boolean }> {
    if (params.amount <= 0) {
      throw new BadRequestException('Debit amount must be positive');
    }

    // Fast idempotency check in Redis
    const redisCacheKey = `idem:${params.idempotencyKey}`;
    const cached = await this.redis.get(redisCacheKey);
    if (cached) {
      const entry = JSON.parse(cached);
      return { ledgerEntryId: entry.id, newBalance: BigInt(entry.balanceAfter), wasIdempotent: true };
    }

    try {
      const result = await this.prisma.$transaction(
        async (tx) => {
          const existing = await tx.tokenLedgerEntry.findUnique({
            where: { idempotencyKey: params.idempotencyKey },
          });
          if (existing) {
            return { entry: existing, wasIdempotent: true };
          }

          const wallet = await tx.tokenWallet.findUniqueOrThrow({
            where: { userId: params.userId },
          });

          if (wallet.balance < BigInt(params.amount)) {
            throw new BadRequestException('Insufficient token balance');
          }

          const newBalance = wallet.balance - BigInt(params.amount);

          const entry = await tx.tokenLedgerEntry.create({
            data: {
              userId: params.userId,
              amount: BigInt(-params.amount),
              balanceAfter: newBalance,
              type: LedgerEntryType.unlock_debit,
              referenceId: params.referenceId,
              idempotencyKey: params.idempotencyKey,
              metadata: params.metadata ? (params.metadata as Prisma.JsonObject) : undefined,
              createdBy: params.actorId,
            },
          });

          await tx.tokenWallet.update({
            where: { userId: params.userId },
            data: { balance: newBalance },
          });

          return { entry, wasIdempotent: false };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        },
      );

      await this.redis.set(
        redisCacheKey,
        JSON.stringify({ id: result.entry.id, balanceAfter: result.entry.balanceAfter.toString() }),
        IDEMPOTENCY_CACHE_TTL,
      );

      if (!result.wasIdempotent) {
        await this.audit.log({
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: AuditAction.token_debit,
          targetType: 'user',
          targetId: params.userId,
          payload: {
            amount: params.amount,
            referenceId: params.referenceId,
          },
        });
      }

      return {
        ledgerEntryId: result.entry.id,
        newBalance: result.entry.balanceAfter,
        wasIdempotent: result.wasIdempotent,
      };
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.tokenLedgerEntry.findUnique({
          where: { idempotencyKey: params.idempotencyKey },
        });
        if (existing) {
          return {
            ledgerEntryId: existing.id,
            newBalance: existing.balanceAfter,
            wasIdempotent: true,
          };
        }
      }
      throw err;
    }
  }
}
