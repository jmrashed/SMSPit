import { Message } from '../entities/message.entity';

export class MessageResponseDto {
  id: string;
  to: string;
  from: string;
  message: string;
  status: string;
  replayed_from: string | null;
  created_at: string;

  static fromEntity(entity: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id;
    dto.to = entity.to;
    dto.from = entity.from;
    dto.message = entity.body;
    dto.status = entity.status;
    dto.replayed_from = entity.replayedFrom;
    dto.created_at = entity.createdAt.toISOString();
    return dto;
  }
}
