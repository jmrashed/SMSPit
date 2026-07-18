import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { In, Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { DeleteMessagesDto } from './dto/delete-messages.dto';
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
      createdAt: new Date(),
    });

    return this.messagesRepository.save(message);
  }

  async findAll(): Promise<Message[]> {
    return this.messagesRepository.find({ order: { createdAt: 'DESC' } });
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
