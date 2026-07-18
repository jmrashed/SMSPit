import { Message } from '../entities/message.entity';
import { MessageResponseDto } from './message-response.dto';

export class MessageListResponseDto {
  messages: MessageResponseDto[];
  total: number;

  static fromEntities(entities: Message[]): MessageListResponseDto {
    const dto = new MessageListResponseDto();
    dto.messages = entities.map(MessageResponseDto.fromEntity);
    dto.total = entities.length;
    return dto;
  }
}
