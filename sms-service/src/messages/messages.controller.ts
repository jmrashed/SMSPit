import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
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
  async create(@Body() dto: CreateMessageDto, @Req() request: Request): Promise<MessageResponseDto> {
    const message = await this.messagesService.create(dto, request.apiKey!.org_id);
    return MessageResponseDto.fromEntity(message);
  }

  @Get()
  async findAll(@Query() query: ListMessagesQueryDto, @Req() request: Request): Promise<MessageListResponseDto> {
    const [messages, total] = await this.messagesService.findAll(query, request.apiKey!.org_id);
    return MessageListResponseDto.fromEntities(messages, total, query.limit, query.offset);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() request: Request): Promise<MessageResponseDto> {
    const message = await this.messagesService.findOne(id, request.apiKey!.org_id);
    return MessageResponseDto.fromEntity(message);
  }

  @Post(':id/replay')
  @HttpCode(HttpStatus.CREATED)
  async replay(@Param('id') id: string, @Req() request: Request): Promise<MessageResponseDto> {
    const replay = await this.messagesService.replay(id, request.apiKey!.org_id);
    return MessageResponseDto.fromEntity(replay);
  }

  @Delete()
  async remove(@Body() dto: DeleteMessagesDto, @Req() request: Request): Promise<DeleteMessagesResponseDto> {
    const deletedCount = await this.messagesService.remove(dto, request.apiKey!.org_id);
    return new DeleteMessagesResponseDto(deletedCount);
  }
}
