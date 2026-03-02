import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudTasksClient } from '@google-cloud/tasks';

export interface TaskPayload {
  url: string;
  body: Record<string, unknown>;
  scheduleTime?: Date;
  taskName?: string;
  headers?: Record<string, string>;
}

@Injectable()
export class CloudTasksService {
  private readonly logger = new Logger(CloudTasksService.name);
  private readonly client: CloudTasksClient;
  private readonly projectId: string;
  private readonly location: string;

  constructor(private readonly config: ConfigService) {
    this.client = new CloudTasksClient();
    this.projectId = this.config.get<string>('GCP_PROJECT_ID', '');
    this.location = this.config.get<string>('GCP_REGION', 'us-central1');
  }

  private queuePath(queueName: string): string {
    return this.client.queuePath(this.projectId, this.location, queueName);
  }

  async enqueueTask(queueName: string, payload: TaskPayload): Promise<string> {
    const parent = this.queuePath(queueName);
    const apiBaseUrl = this.config.get<string>('INTERNAL_API_URL', '');

    const task: Record<string, unknown> = {
      httpRequest: {
        httpMethod: 'POST',
        url: `${apiBaseUrl}${payload.url}`,
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Secret': this.config.get<string>('INTERNAL_API_SECRET', ''),
          ...payload.headers,
        },
        body: Buffer.from(JSON.stringify(payload.body)).toString('base64'),
      },
    };

    if (payload.scheduleTime) {
      task.scheduleTime = {
        seconds: Math.floor(payload.scheduleTime.getTime() / 1000),
      };
    }

    if (payload.taskName) {
      task.name = `${parent}/tasks/${payload.taskName}`;
    }

    try {
      const [response] = await this.client.createTask({ parent, task });
      this.logger.debug(`Task created: ${response.name}`);
      return response.name ?? '';
    } catch (err: unknown) {
      // ALREADY_EXISTS (6) means task with this name exists — safe to ignore
      if ((err as { code?: number }).code === 6) {
        this.logger.debug(`Task already exists: ${payload.taskName}`);
        return payload.taskName ?? '';
      }
      throw err;
    }
  }

  async deleteTask(queueName: string, taskName: string): Promise<void> {
    const parent = this.queuePath(queueName);
    const name = `${parent}/tasks/${taskName}`;
    try {
      await this.client.deleteTask({ name });
    } catch (err: unknown) {
      // NOT_FOUND (5) means task already ran or doesn't exist — safe to ignore
      if ((err as { code?: number }).code === 5) return;
      throw err;
    }
  }
}
