import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, FindOptionsWhere, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { DeleteMessagesDto } from './dto/delete-messages.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { ExportMessagesQueryDto } from './dto/export-messages-query.dto';
import { Message, MessageStatus } from './entities/message.entity';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { AiClient } from '../ai/ai-client';
import { QueuePublisher } from '../queue/queue-publisher';
import { MetricsService } from '../metrics/metrics.service';

const EXPORT_BATCH_SIZE = 500;

// TypeORM's FindOptionsWhere type for a nullable numeric column doesn't
// accept a plain `null` (only `number | FindOperator<number>`), even
// though `IsNull()` is exactly the operator it means -- this bridges
// that so callers can keep passing `number | null` around.
function orgWhere(orgId: number | null): number | ReturnType<typeof IsNull> {
  return orgId === null ? IsNull() : orgId;
}

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly aiClient: AiClient,
    private readonly queuePublisher: QueuePublisher,
    private readonly metrics: MetricsService,
  ) {}

  async create(dto: CreateMessageDto, orgId: number | null): Promise<Message> {
    const [otp, category, isSpam] = await Promise.all([
      this.aiClient.detectOtp(dto.message),
      this.aiClient.classify(dto.message),
      this.aiClient.detectSpam(dto.message),
    ]);

    const message = this.messagesRepository.create({
      id: `sms_${randomBytes(8).toString('hex')}`,
      to: dto.to,
      from: dto.from,
      body: dto.message,
      otp,
      category,
      isSpam,
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      orgId,
      createdAt: new Date(),
    });

    const saved = await this.messagesRepository.save(message);
    this.realtimeGateway.broadcastMessageCreated(saved);
    await this.queuePublisher.publishMessageCaptured(saved);
    this.metrics.messagesCapturedTotal.inc({ category: category ?? 'unknown' });
    if (otp) this.metrics.otpDetectedTotal.inc();

    return saved;
  }

  async findAll(query: ListMessagesQueryDto, orgId: number | null): Promise<[Message[], number]> {
    const where = this.buildFilterWhere(query, orgId);

    return this.messagesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  // Shared by findAll and streamExportBatches -- both filter on the same
  // to/from/created_after/created_before fields, just with different
  // pagination on top.
  private buildFilterWhere(
    query: Pick<ListMessagesQueryDto, 'to' | 'from' | 'category' | 'is_spam' | 'created_after' | 'created_before'>,
    orgId: number | null,
  ): FindOptionsWhere<Message> {
    // A NULL org_id is its own bucket ("ungrouped"), not a wildcard --
    // see docs/multi-tenancy.md. Assigning null here still filters
    // correctly: TypeORM translates a null property value to "IS NULL".
    const where: FindOptionsWhere<Message> = { orgId: orgWhere(orgId) };

    if (query.to) where.to = query.to;
    if (query.from) where.from = query.from;
    if (query.category) where.category = query.category;
    if (query.is_spam !== undefined) where.isSpam = query.is_spam;

    if (query.created_after && query.created_before) {
      where.createdAt = Between(new Date(query.created_after), new Date(query.created_before));
    } else if (query.created_after) {
      where.createdAt = MoreThanOrEqual(new Date(query.created_after));
    } else if (query.created_before) {
      where.createdAt = LessThanOrEqual(new Date(query.created_before));
    }

    return where;
  }

  // Yields matching messages in fixed-size batches (offset pagination),
  // so a caller can write each batch to the response as it arrives
  // instead of holding the full export in memory at once.
  async *streamExportBatches(query: ExportMessagesQueryDto, orgId: number | null): AsyncGenerator<Message[]> {
    const where = this.buildFilterWhere(query, orgId);
    let offset = 0;

    while (true) {
      const batch = await this.messagesRepository.find({
        where,
        order: { createdAt: 'ASC', id: 'ASC' },
        take: EXPORT_BATCH_SIZE,
        skip: offset,
      });

      if (batch.length === 0) {
        return;
      }

      yield batch;
      offset += batch.length;

      if (batch.length < EXPORT_BATCH_SIZE) {
        return;
      }
    }
  }

  async findOne(id: string, orgId: number | null): Promise<Message> {
    this.logger.log(`Looking up message ${id}`);
    const message = await this.messagesRepository.findOneBy({ id, orgId: orgWhere(orgId) });

    if (!message) {
      this.logger.warn(`Message ${id} not found`);
      throw new NotFoundException(`Message ${id} not found`);
    }

    return message;
  }

  async replay(id: string, orgId: number | null): Promise<Message> {
    const original = await this.findOne(id, orgId);

    const replay = this.messagesRepository.create({
      id: `sms_${randomBytes(8).toString('hex')}`,
      to: original.to,
      from: original.from,
      body: original.body,
      // Same body as the original -- reuse its detected OTP/category/spam
      // verdict rather than re-calling ai-service for an identical input.
      otp: original.otp,
      category: original.category,
      isSpam: original.isSpam,
      status: MessageStatus.CAPTURED,
      replayedFrom: original.id,
      orgId,
      createdAt: new Date(),
    });

    const saved = await this.messagesRepository.save(replay);
    this.logger.log(`Replayed message ${original.id} as ${saved.id}`);
    this.realtimeGateway.broadcastMessageCreated(saved);
    await this.queuePublisher.publishMessageCaptured(saved);

    return saved;
  }

  // Manual override (Day 73) -- lets a user correct ai-service's spam
  // verdict directly on the message record, e.g. "mark as not spam".
  async setSpam(id: string, isSpam: boolean, orgId: number | null): Promise<Message> {
    const message = await this.findOne(id, orgId);
    message.isSpam = isSpam;
    return this.messagesRepository.save(message);
  }

  async remove(dto: DeleteMessagesDto, orgId: number | null): Promise<number> {
    const hasIds = !!dto.ids && dto.ids.length > 0;

    if (!hasIds && !dto.confirm) {
      throw new BadRequestException('Deleting all messages requires "confirm": true when "ids" is omitted');
    }

    const result = hasIds
      ? await this.messagesRepository.delete({ id: In(dto.ids!), orgId: orgWhere(orgId) })
      : await this.messagesRepository.delete({ orgId: orgWhere(orgId) });

    const deletedCount = result.affected ?? 0;
    this.logger.log(
      hasIds
        ? `Deleted ${deletedCount} message(s) by id: ${dto.ids!.join(', ')}`
        : `Deleted ALL messages (${deletedCount}) via confirmed wipe`,
    );

    return deletedCount;
  }
}
