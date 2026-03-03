import {
  Injectable,
  BadRequestException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { AuditService } from '../../common/audit/audit.service';
import { PubSubService } from '../../infrastructure/pubsub/pubsub.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { AuditAction, IAPPlatform, IAPTransactionStatus, LedgerEntryType } from '@prisma/client';
import * as crypto from 'crypto';

interface IAPProduct {
  tokenAmount: number;
  priceUsdCents: number;
}

const IAP_PRODUCTS: Record<string, IAPProduct> = {
  tokens_100:  { tokenAmount: 100,  priceUsdCents: 99 },
  tokens_500:  { tokenAmount: 500,  priceUsdCents: 399 },
  tokens_1200: { tokenAmount: 1200, priceUsdCents: 799 },
  tokens_3000: { tokenAmount: 3000, priceUsdCents: 1499 },
};

@Injectable()
export class IAPService {
  private readonly logger = new Logger(IAPService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly pubSub: PubSubService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
  ) {}

  // ── APPLE ────────────────────────────────────

  async validateAppleReceipt(
    userId: string,
    jwsTransaction: string,
    deviceId?: string,
  ): Promise<{ tokensAdded: number; newBalance: string }> {
    const environment = this.config.get<string>('NODE_ENV', 'development');

    // Decode JWT (StoreKit 2 — JWS format)
    const parts = jwsTransaction.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid JWS transaction format');
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Failed to decode JWS payload');
    }

    const transactionId = payload['transactionId'] as string;
    const productId = payload['productId'] as string;
    const appBundleId = payload['bundleId'] as string;
    const txEnvironment = payload['environment'] as string;

    if (!transactionId || !productId) {
      throw new BadRequestException('Missing required fields in JWS payload');
    }

    // Reject sandbox receipts in production
    if (environment === 'production' && txEnvironment === 'Sandbox') {
      throw new BadRequestException('Sandbox receipt rejected in production');
    }

    // Validate bundle ID
    const expectedBundleId = this.config.get<string>('APPLE_APP_BUNDLE_ID', '');
    if (appBundleId !== expectedBundleId) {
      throw new BadRequestException('Bundle ID mismatch');
    }

    // TODO Phase 2: Verify JWS signature using Apple's public keys from
    // https://appleid.apple.com/auth/keys (cached 24h)
    // For MVP: trust payload structure, validate via App Store Server API if needed

    const product = IAP_PRODUCTS[productId];
    if (!product) {
      throw new BadRequestException(`Unknown product: ${productId}`);
    }

    const idempotencyKey = `iap_apple_${transactionId}`;
    const receiptHash = crypto.createHash('sha256').update(jwsTransaction).digest('hex');

    // Create or update IAP transaction record
    const existingTx = await this.prisma.iAPTransaction.findUnique({
      where: { storeTransactionId: transactionId },
    });

    if (existingTx && existingTx.status === IAPTransactionStatus.credited) {
      const balance = await this.tokens.getBalance(userId);
      return { tokensAdded: 0, newBalance: balance.toString() };
    }

    // Create transaction record
    const iapTx = await this.prisma.iAPTransaction.upsert({
      where: { storeTransactionId: transactionId },
      create: {
        userId,
        platform: IAPPlatform.apple,
        storeTransactionId: transactionId,
        productId,
        tokenAmount: product.tokenAmount,
        amountUsdCents: product.priceUsdCents,
        receiptData: receiptHash,
        validationResponse: payload as Prisma.InputJsonValue,
        status: IAPTransactionStatus.validated,
        idempotencyKey,
      },
      update: { status: IAPTransactionStatus.validated },
    });

    // Credit tokens
    const { newBalance } = await this.tokens.credit({
      userId,
      amount: product.tokenAmount,
      type: LedgerEntryType.iap_purchase,
      idempotencyKey,
      referenceId: transactionId,
      metadata: { platform: 'apple', productId, transactionId },
      actorId: userId,
      actorRole: 'user',
    });

    // Mark transaction as credited
    await this.prisma.iAPTransaction.update({
      where: { id: iapTx.id },
      data: { status: IAPTransactionStatus.credited },
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.iap_validate,
      targetType: 'iap_transaction',
      targetId: iapTx.id,
      payload: { platform: 'apple', productId, tokenAmount: product.tokenAmount },
    });

    return { tokensAdded: product.tokenAmount, newBalance: newBalance.toString() };
  }

  // ── GOOGLE ───────────────────────────────────

  async validateGooglePurchase(
    userId: string,
    purchaseToken: string,
    productId: string,
  ): Promise<{ tokensAdded: number; newBalance: string }> {
    const product = IAP_PRODUCTS[productId];
    if (!product) {
      throw new BadRequestException(`Unknown product: ${productId}`);
    }

    // TODO Phase 2: Call Google Play Developer API to verify purchase
    // GET /androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{token}
    // Then POST to consume the purchase
    // For now: stub validates structure and credits

    const transactionId = `google_${purchaseToken.substring(0, 20)}`;
    const idempotencyKey = `iap_google_${purchaseToken}`;

    const existingTx = await this.prisma.iAPTransaction.findFirst({
      where: { storeTransactionId: purchaseToken },
    });

    if (existingTx && existingTx.status === IAPTransactionStatus.credited) {
      const balance = await this.tokens.getBalance(userId);
      return { tokensAdded: 0, newBalance: balance.toString() };
    }

    const iapTx = await this.prisma.iAPTransaction.upsert({
      where: { storeTransactionId: purchaseToken },
      create: {
        userId,
        platform: IAPPlatform.google,
        storeTransactionId: purchaseToken,
        productId,
        tokenAmount: product.tokenAmount,
        amountUsdCents: product.priceUsdCents,
        status: IAPTransactionStatus.validated,
        idempotencyKey,
      },
      update: { status: IAPTransactionStatus.validated },
    });

    const { newBalance } = await this.tokens.credit({
      userId,
      amount: product.tokenAmount,
      type: LedgerEntryType.iap_purchase,
      idempotencyKey,
      referenceId: purchaseToken,
      metadata: { platform: 'google', productId, purchaseToken },
      actorId: userId,
      actorRole: 'user',
    });

    await this.prisma.iAPTransaction.update({
      where: { id: iapTx.id },
      data: { status: IAPTransactionStatus.credited },
    });

    await this.audit.log({
      actorId: userId,
      action: AuditAction.iap_validate,
      targetType: 'iap_transaction',
      targetId: iapTx.id,
      payload: { platform: 'google', productId, tokenAmount: product.tokenAmount },
    });

    return { tokensAdded: product.tokenAmount, newBalance: newBalance.toString() };
  }

  // ── REFUND WEBHOOKS ──────────────────────────

  async handleAppleRefundWebhook(payload: Record<string, unknown>): Promise<void> {
    // Apple App Store Server Notification v2
    // notificationType: REFUND
    const signedPayload = payload['signedPayload'] as string;
    if (!signedPayload) return;

    // Decode the JWS payload
    let notification: Record<string, unknown>;
    try {
      const parts = signedPayload.split('.');
      notification = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      this.logger.warn('Failed to decode Apple refund notification');
      return;
    }

    const notificationType = notification['notificationType'] as string;
    if (notificationType !== 'REFUND') return;

    const data = notification['data'] as Record<string, unknown>;
    const signedTransactionInfo = data?.['signedTransactionInfo'] as string;
    if (!signedTransactionInfo) return;

    let txInfo: Record<string, unknown>;
    try {
      const parts = signedTransactionInfo.split('.');
      txInfo = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    } catch {
      return;
    }

    const transactionId = txInfo['transactionId'] as string;
    if (!transactionId) return;

    await this.processRefund('apple', transactionId);
  }

  async handleGoogleRefundWebhook(payload: Record<string, unknown>): Promise<void> {
    // Google Play Real-Time Developer Notifications via Pub/Sub
    const message = payload['message'] as Record<string, unknown>;
    if (!message) return;

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(Buffer.from(message['data'] as string, 'base64').toString('utf8'));
    } catch {
      return;
    }

    const oneTimeProductNotification = data['oneTimeProductNotification'] as Record<string, unknown>;
    if (!oneTimeProductNotification) return;

    const notificationType = oneTimeProductNotification['notificationType'] as number;
    // Type 3 = ONE_TIME_PRODUCT_CANCELED
    if (notificationType !== 3) return;

    const purchaseToken = oneTimeProductNotification['purchaseToken'] as string;
    if (!purchaseToken) return;

    await this.processRefund('google', purchaseToken);
  }

  private async processRefund(platform: 'apple' | 'google', storeId: string): Promise<void> {
    const tx = await this.prisma.iAPTransaction.findFirst({
      where: { storeTransactionId: storeId, platform: platform === 'apple' ? IAPPlatform.apple : IAPPlatform.google },
    });

    if (!tx || tx.status === IAPTransactionStatus.refunded) return;

    const wallet = await this.prisma.tokenWallet.findUnique({ where: { userId: tx.userId } });
    const tokensInWallet = wallet?.balance ?? BigInt(0);

    if (tokensInWallet >= BigInt(tx.tokenAmount)) {
      // Hybrid: auto-reverse since tokens are still in wallet
      const refundIdempotencyKey = `refund_${platform}_${storeId}`;

      await this.tokens.credit({
        userId: tx.userId,
        amount: -tx.tokenAmount, // negative credit = debit
        type: LedgerEntryType.refund_reversal,
        idempotencyKey: refundIdempotencyKey,
        referenceId: storeId,
        metadata: { platform, storeId, tokenAmount: tx.tokenAmount },
      });

      await this.prisma.iAPTransaction.update({
        where: { id: tx.id },
        data: { status: IAPTransactionStatus.refunded, refundedAt: new Date() },
      });

      await this.audit.log({
        action: AuditAction.iap_refund,
        targetType: 'iap_transaction',
        targetId: tx.id,
        payload: { platform, storeId, autoReversed: true, tokenAmount: tx.tokenAmount },
      });
    } else {
      // Tokens spent — escalate to moderation queue
      const topic = this.config.get<string>('PUBSUB_IAP_REFUND_TOPIC', '');
      await this.pubSub.publish(topic, {
        userId: tx.userId,
        iapTransactionId: tx.id,
        platform,
        storeId,
        tokenAmount: tx.tokenAmount,
        reason: 'tokens_spent',
        timestamp: new Date().toISOString(),
      });

      await this.audit.log({
        action: AuditAction.iap_refund,
        targetType: 'iap_transaction',
        targetId: tx.id,
        payload: { platform, storeId, escalated: true, tokenAmount: tx.tokenAmount },
      });
    }
  }
}
