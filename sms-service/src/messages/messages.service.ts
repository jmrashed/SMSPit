import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
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
}
