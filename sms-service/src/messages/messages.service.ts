import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { CreateMessageDto } from './dto/create-message.dto';
import { Message, MessageStatus } from './entities/message.entity';

@Injectable()
export class MessagesService {
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
}
