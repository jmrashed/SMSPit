import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessagesService } from './messages.service';

@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMessageDto): Promise<MessageResponseDto> {
    const message = await this.messagesService.create(dto);
    return MessageResponseDto.fromEntity(message);
  }
}
