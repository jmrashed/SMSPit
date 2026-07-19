import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { MessageListResponseDto } from './dto/message-list-response.dto';
import { ListMessagesQueryDto } from './dto/list-messages-query.dto';
import { DeleteMessagesDto } from './dto/delete-messages.dto';
import { DeleteMessagesResponseDto } from './dto/delete-messages-response.dto';
import { MessagesService } from './messages.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('messages')
@UseGuards(ApiKeyGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateMessageDto): Promise<MessageResponseDto> {
    const message = await this.messagesService.create(dto);
    return MessageResponseDto.fromEntity(message);
  }

  @Get()
  async findAll(@Query() query: ListMessagesQueryDto): Promise<MessageListResponseDto> {
    const [messages, total] = await this.messagesService.findAll(query);
    return MessageListResponseDto.fromEntities(messages, total, query.limit, query.offset);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<MessageResponseDto> {
    const message = await this.messagesService.findOne(id);
    return MessageResponseDto.fromEntity(message);
  }

  @Delete()
  async remove(@Body() dto: DeleteMessagesDto): Promise<DeleteMessagesResponseDto> {
    const deletedCount = await this.messagesService.remove(dto);
    return new DeleteMessagesResponseDto(deletedCount);
  }
}
