import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PubSub, Topic, Message } from '@google-cloud/pubsub';

@Injectable()
export class PubSubService {
  private readonly logger = new Logger(PubSubService.name);
  private readonly client: PubSub;
  private readonly topicCache = new Map<string, Topic>();

  constructor(private readonly config: ConfigService) {
    this.client = new PubSub({
      projectId: this.config.get<string>('GCP_PROJECT_ID'),
    });
  }

  private getTopic(topicName: string): Topic {
    if (!this.topicCache.has(topicName)) {
      this.topicCache.set(topicName, this.client.topic(topicName));
    }
    return this.topicCache.get(topicName)!;
  }

  async publish(topicName: string, data: Record<string, unknown>, attributes?: Record<string, string>): Promise<string> {
    const topic = this.getTopic(topicName);
    const messageBuffer = Buffer.from(JSON.stringify(data));

    try {
      const messageId = await topic.publishMessage({
        data: messageBuffer,
        attributes,
      });
      this.logger.debug(`Published to ${topicName}: ${messageId}`);
      return messageId;
    } catch (err) {
      this.logger.error(`Failed to publish to ${topicName}`, err);
      throw err;
    }
  }

  parseMessage<T>(message: Message): T {
    return JSON.parse(message.data.toString()) as T;
  }
}
