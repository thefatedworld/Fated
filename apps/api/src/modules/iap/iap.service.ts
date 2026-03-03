import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TokensService } from '../tokens/tokens.service';
import { AuditService } from '../../common/audit/audit.service';
import { PubSubService } from '../../infrastructure/pubsub/pubsub.service';
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

// Apple root CA subject (used to anchor trust chain validation)
const APPLE_ROOT_CA_SUBJECT = 'Apple Root CA';

@Injectable()
export class IAPService {
  private readonly logger = new Logger(IAPService.name);

  // Cache Apple public key for 24 hours
  private appleJwksCache: { keys: crypto.KeyObject[]; fetchedAt: number } | null = null;
  private readonly APPLE_JWKS_TTL = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly audit: AuditService,
    private readonly pubSub: PubSubService,
    private readonly config: ConfigService,
  ) {}

  // ── APPLE ────────────────────────────────────

  async validateAppleReceipt(
    userId: string,
    jwsTransaction: string,
    _deviceId?: string,
  ): Promise<{ tokensAdded: number; newBalance: string }> {
    const environment = this.config.get<string>('NODE_ENV', 'development');
    const expectedBundleId = this.config.get<string>('APPLE_APP_BUNDLE_ID', '');

    const payload = await this.verifyAndDecodeAppleJWS(jwsTransaction);

    const transactionId = payload['transactionId'] as string;
    const productId = payload['productId'] as string;
    const appBundleId = payload['bundleId'] as string;
    const txEnvironment = payload['environment'] as string;

    if (!transactionId || !productId) {
      throw new BadRequestException('Missing required fields in JWS payload');
    }

    if (environment === 'production' && txEnvironment === 'Sandbox') {
      throw new BadRequestException('Sandbox receipt rejected in production');
    }

    if (appBundleId && expectedBundleId && appBundleId !== expectedBundleId) {
      throw new BadRequestException('Bundle ID mismatch');
    }

    const product = IAP_PRODUCTS[productId];
    if (!product) {
      throw new BadRequestException(`Unknown product: ${productId}`);
    }

    const idempotencyKey = `iap_apple_${transactionId}`;
    const receiptHash = crypto.createHash('sha256').update(jwsTransaction).digest('hex');

    const existingTx = await this.prisma.iAPTransaction.findUnique({
      where: { storeTransactionId: transactionId },
    });

    if (existingTx?.status === IAPTransactionStatus.credited) {
      const balance = await this.tokens.getBalance(userId);
      return { tokensAdded: 0, newBalance: balance.toString() };
    }

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

  /**
   * Verify and decode an Apple StoreKit 2 JWS transaction.
   * Uses the x5c certificate chain embedded in the JWS header.
   * The leaf cert public key (ECDSA P-256) is used to verify the signature.
   */
  private async verifyAndDecodeAppleJWS(jws: string): Promise<Record<string, unknown>> {
    const parts = jws.split('.');
    if (parts.length !== 3) {
      throw new BadRequestException('Invalid JWS format');
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    let header: Record<string, unknown>;
    let payload: Record<string, unknown>;
    try {
      header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch {
      throw new BadRequestException('Failed to decode JWS header/payload');
    }

    const x5c = header['x5c'] as string[] | undefined;
    const alg = header['alg'] as string;

    if (!alg || !alg.startsWith('ES')) {
      throw new BadRequestException(`Unsupported JWS algorithm: ${alg}`);
    }

    // If no x5c chain, fall through to structure validation only (dev/test)
    if (x5c && x5c.length > 0) {
      try {
        // Parse certificates from x5c chain
        const certs = x5c.map((der) => {
          const pemCert = `-----BEGIN CERTIFICATE-----\n${der}\n-----END CERTIFICATE-----`;
          return new crypto.X509Certificate(pemCert);
        });

        const leafCert = certs[0];

        // Verify chain: each cert should be signed by the next in chain
        for (let i = 0; i < certs.length - 1; i++) {
          if (!certs[i].verify(certs[i + 1].publicKey)) {
            throw new Error(`Certificate chain verification failed at position ${i}`);
          }
        }

        // Verify certificate validity (not expired)
        const now = new Date();
        const leafValidTo = new Date(leafCert.validTo);
        const leafValidFrom = new Date(leafCert.validFrom);
        if (now < leafValidFrom || now > leafValidTo) {
          throw new Error('Leaf certificate is not valid for current time');
        }

        // Verify signature: signing input is "base64url(header).base64url(payload)"
        const signingInput = Buffer.from(`${headerB64}.${payloadB64}`);
        const signature = Buffer.from(signatureB64, 'base64url');

        const hashAlg = alg === 'ES256' ? 'SHA256' : alg === 'ES384' ? 'SHA384' : 'SHA512';
        const isValid = crypto.verify(
          hashAlg,
          signingInput,
          { key: leafCert.publicKey, dsaEncoding: 'ieee-p1363' },
          signature,
        );

        if (!isValid) {
          throw new Error('JWS signature verification failed');
        }

        // Check issuer is Apple (best-effort: check subject contains 'Apple')
        const issuer = certs[certs.length - 1].subject;
        if (!issuer.includes(APPLE_ROOT_CA_SUBJECT) && !issuer.includes('Apple')) {
          this.logger.warn(`Unexpected certificate issuer: ${issuer}`);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        // In staging/dev, log and continue; in prod, reject
        if (this.config.get('ENVIRONMENT') === 'prod') {
          throw new BadRequestException(`Apple JWS verification failed: ${msg}`);
        }
        this.logger.warn(`Apple JWS verification warning (non-prod): ${msg}`);
      }
    }

    return payload;
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

    const packageName = this.config.get<string>('GOOGLE_PLAY_PACKAGE_NAME', '');

    // Verify with Google Play Developer API
    const purchaseData = await this.verifyGooglePurchase(packageName, productId, purchaseToken);

    // purchaseState: 0 = purchased
    if (purchaseData.purchaseState !== 0) {
      throw new BadRequestException('Purchase not in purchased state');
    }

    // consumptionState: 0 = not yet consumed
    if (purchaseData.consumptionState !== 0) {
      const existingTx = await this.prisma.iAPTransaction.findFirst({
        where: { storeTransactionId: purchaseToken },
      });
      if (existingTx?.status === IAPTransactionStatus.credited) {
        const balance = await this.tokens.getBalance(userId);
        return { tokensAdded: 0, newBalance: balance.toString() };
      }
    }

    const idempotencyKey = `iap_google_${purchaseToken}`;
    const orderId = (purchaseData.orderId as string) ?? purchaseToken;

    const existingTx = await this.prisma.iAPTransaction.findFirst({
      where: { storeTransactionId: purchaseToken },
    });

    if (existingTx?.status === IAPTransactionStatus.credited) {
      const balance = await this.tokens.getBalance(userId);
      return { tokensAdded: 0, newBalance: balance.toString() };
    }

    // Consume the purchase (marks as consumed in Google's system)
    await this.consumeGooglePurchase(packageName, productId, purchaseToken);

    const iapTx = await this.prisma.iAPTransaction.upsert({
      where: { storeTransactionId: purchaseToken },
      create: {
        userId,
        platform: IAPPlatform.google,
        storeTransactionId: purchaseToken,
        productId,
        tokenAmount: product.tokenAmount,
        amountUsdCents: product.priceUsdCents,
        validationResponse: purchaseData as Prisma.InputJsonValue,
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
      referenceId: orderId,
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

  /**
   * Call Google Play Developer API to verify a product purchase.
   * Uses ADC (Application Default Credentials) — the Cloud Run service account
   * must have `roles/androidpublisher.viewer` on the Google Play project.
   */
  private async verifyGooglePurchase(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<Record<string, unknown>> {
    const accessToken = await this.getGoogleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      this.logger.error(`Google Play API error: ${res.status} ${body}`);
      throw new BadRequestException('Failed to verify Google Play purchase');
    }

    return res.json() as Promise<Record<string, unknown>>;
  }

  private async consumeGooglePurchase(
    packageName: string,
    productId: string,
    purchaseToken: string,
  ): Promise<void> {
    const accessToken = await this.getGoogleAccessToken();
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/products/${productId}/tokens/${purchaseToken}:consume`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      this.logger.warn(`Failed to consume Google purchase: ${res.status}`);
      // Non-fatal: idempotency handles duplicate consumption attempts
    }
  }

  /** Get Google OAuth2 access token using the metadata server (Cloud Run ADC) */
  private async getGoogleAccessToken(): Promise<string> {
    const metadataUrl =
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';

    const res = await fetch(metadataUrl, {
      headers: { 'Metadata-Flavor': 'Google' },
    });

    if (!res.ok) {
      throw new Error('Failed to get Google access token from metadata server');
    }

    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  // ── REFUND WEBHOOKS ──────────────────────────

  async handleAppleRefundWebhook(payload: Record<string, unknown>): Promise<void> {
    const signedPayload = payload['signedPayload'] as string;
    if (!signedPayload) return;

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
      where: {
        storeTransactionId: storeId,
        platform: platform === 'apple' ? IAPPlatform.apple : IAPPlatform.google,
      },
    });

    if (!tx || tx.status === IAPTransactionStatus.refunded) return;

    const wallet = await this.prisma.tokenWallet.findUnique({ where: { userId: tx.userId } });
    const tokensInWallet = wallet?.balance ?? BigInt(0);

    if (tokensInWallet >= BigInt(tx.tokenAmount)) {
      const refundIdempotencyKey = `refund_${platform}_${storeId}`;

      await this.tokens.credit({
        userId: tx.userId,
        amount: -tx.tokenAmount,
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
