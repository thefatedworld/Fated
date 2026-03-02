import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

@Injectable()
export class SecretsService {
  private readonly logger = new Logger(SecretsService.name);
  private readonly client: SecretManagerServiceClient;
  private readonly cache = new Map<string, { value: string; expiresAt: number }>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly config: ConfigService) {
    this.client = new SecretManagerServiceClient();
  }

  async getSecret(secretName: string): Promise<string> {
    const projectId = this.config.get<string>('GCP_PROJECT_ID');
    const cacheKey = `${projectId}/${secretName}`;

    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const name = `projects/${projectId}/secrets/${secretName}/versions/latest`;
      const [version] = await this.client.accessSecretVersion({ name });
      const value = version.payload?.data?.toString() ?? '';

      this.cache.set(cacheKey, {
        value,
        expiresAt: Date.now() + this.cacheTtlMs,
      });

      return value;
    } catch (err) {
      this.logger.error(`Failed to fetch secret ${secretName}`, err);
      throw err;
    }
  }
}
