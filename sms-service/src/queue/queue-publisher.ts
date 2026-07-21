import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Message } from '../messages/entities/message.entity';

// Redis Streams backs the worker queue (see docs/redis.md) -- separate
// from RealtimeGateway's direct in-process WebSocket broadcast, which
// already covers the dashboard's live-update needs on its own.
export const CAPTURED_STREAM = 'sms.messages.created';

// Publishing must never block or fail a capture -- same reasoning as
// AiClient (Day 68): Redis being down degrades to "no job queued", not
// a 5xx on the capture request.
@Injectable()
export class QueuePublisher implements OnModuleDestroy {
  private readonly logger = new Logger(QueuePublisher.name);
  private readonly redis: Redis | null;

  constructor(config: ConfigService) {
    const host = config.get<string>('REDIS_HOST');
    const port = config.get<number>('REDIS_PORT');

    this.redis = host
      ? new Redis({
          host,
          port: port ?? 6379,
          lazyConnect: true,
          retryStrategy: () => null, // don't hang capture requests retrying a dead Redis
        })
      : null;
  }

  async publishMessageCaptured(message: Message): Promise<void> {
    if (!this.redis) return;

    try {
      await this.redis.xadd(
        CAPTURED_STREAM,
        '*',
        'id',
        message.id,
        'to',
        message.to,
        'from',
        message.from,
        'message',
        message.body,
        'org_id',
        message.orgId === null ? '' : String(message.orgId),
      );
    } catch (error) {
      this.logger.warn(`Failed to publish ${CAPTURED_STREAM} for ${message.id}: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis?.quit();
  }
}
