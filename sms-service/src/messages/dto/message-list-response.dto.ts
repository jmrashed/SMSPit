import { Message } from '../entities/message.entity';
import { MessageResponseDto } from './message-response.dto';

export class MessageListResponseDto {
  messages: MessageResponseDto[];
  total: number;
  limit: number;
  offset: number;

  static fromEntities(entities: Message[], total: number, limit: number, offset: number): MessageListResponseDto {
    const dto = new MessageListResponseDto();
    dto.messages = entities.map(MessageResponseDto.fromEntity);
    dto.total = total;
    dto.limit = limit;
    dto.offset = offset;
    return dto;
  }
}
