import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Between, FindOptionsWhere, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { DeleteMessagesDto } from './dto/delete-messages.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { Message, MessageStatus } from './entities/message.entity';

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(
    @InjectRepository(Message)
    private readonly messagesRepository: Repository<Message>,
  ) {}

  async create(dto: CreateMessageDto): Promise<Message> {
    const message = this.messagesRepository.create({
      id: `sms_${randomBytes(8).toString('hex')}`,
      to: dto.to,
      from: dto.from,
      body: dto.message,
      status: MessageStatus.CAPTURED,
      replayedFrom: null,
      createdAt: new Date(),
    });

    return this.messagesRepository.save(message);
  }

  async findAll(query: ListMessagesQueryDto): Promise<[Message[], number]> {
    const where: FindOptionsWhere<Message> = {};

    if (query.to) where.to = query.to;
    if (query.from) where.from = query.from;

    if (query.created_after && query.created_before) {
      where.createdAt = Between(new Date(query.created_after), new Date(query.created_before));
    } else if (query.created_after) {
      where.createdAt = MoreThanOrEqual(new Date(query.created_after));
    } else if (query.created_before) {
      where.createdAt = LessThanOrEqual(new Date(query.created_before));
    }

    return this.messagesRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }

  async findOne(id: string): Promise<Message> {
    this.logger.log(`Looking up message ${id}`);
    const message = await this.messagesRepository.findOneBy({ id });

    if (!message) {
      this.logger.warn(`Message ${id} not found`);
      throw new NotFoundException(`Message ${id} not found`);
    }

    return message;
  }

  async replay(id: string): Promise<Message> {
    const original = await this.findOne(id);

    const replay = this.messagesRepository.create({
      id: `sms_${randomBytes(8).toString('hex')}`,
      to: original.to,
      from: original.from,
      body: original.body,
      status: MessageStatus.CAPTURED,
      replayedFrom: original.id,
      createdAt: new Date(),
    });

    const saved = await this.messagesRepository.save(replay);
    this.logger.log(`Replayed message ${original.id} as ${saved.id}`);

    return saved;
  }

  async remove(dto: DeleteMessagesDto): Promise<number> {
    const hasIds = !!dto.ids && dto.ids.length > 0;

    if (!hasIds && !dto.confirm) {
      throw new BadRequestException('Deleting all messages requires "confirm": true when "ids" is omitted');
    }

    const result = hasIds
      ? await this.messagesRepository.delete({ id: In(dto.ids!) })
      : await this.messagesRepository.createQueryBuilder().delete().execute();

    const deletedCount = result.affected ?? 0;
    this.logger.log(
      hasIds
        ? `Deleted ${deletedCount} message(s) by id: ${dto.ids!.join(', ')}`
        : `Deleted ALL messages (${deletedCount}) via confirmed wipe`,
    );

    return deletedCount;
  }
}
