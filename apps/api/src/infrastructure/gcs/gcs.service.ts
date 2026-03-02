import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';
import * as crypto from 'crypto';

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private readonly storage: Storage;

  constructor(private readonly config: ConfigService) {
    this.storage = new Storage({
      projectId: this.config.get<string>('GCP_PROJECT_ID'),
    });
  }

  async generateUploadSignedUrl(
    bucket: string,
    objectKey: string,
    contentType: string,
    expiresInMinutes = 60,
  ): Promise<string> {
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'write',
      expires: Date.now() + expiresInMinutes * 60 * 1000,
      contentType,
    };

    const [url] = await this.storage.bucket(bucket).file(objectKey).getSignedUrl(options);
    return url;
  }

  async generateDownloadSignedUrl(
    bucket: string,
    objectKey: string,
    expiresInSeconds = 4 * 3600,
  ): Promise<string> {
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInSeconds * 1000,
    };

    const [url] = await this.storage.bucket(bucket).file(objectKey).getSignedUrl(options);
    return url;
  }

  /**
   * Generate a Cloud CDN signed URL for video delivery.
   * Uses HMAC-SHA1 with the CDN URL signing key.
   */
  generateCdnSignedUrl(
    baseUrl: string,
    objectPath: string,
    keyName: string,
    signingKey: Buffer,
    expiresInSeconds = 4 * 3600,
  ): string {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const urlToSign = `${baseUrl}${objectPath}?Expires=${expiresAt}&KeyName=${keyName}`;

    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(urlToSign)
      .digest('base64url');

    return `${urlToSign}&Signature=${signature}`;
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    try {
      await this.storage.bucket(bucket).file(objectKey).delete();
    } catch (err) {
      this.logger.error(`Failed to delete GCS object ${bucket}/${objectKey}`, err);
      throw err;
    }
  }

  async objectExists(bucket: string, objectKey: string): Promise<boolean> {
    const [exists] = await this.storage.bucket(bucket).file(objectKey).exists();
    return exists;
  }
}
