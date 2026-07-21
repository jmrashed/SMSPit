import { Message } from '../entities/message.entity';

export class MessageResponseDto {
  id: string;
  to: string;
  from: string;
  message: string;
  otp: string | null;
  category: string | null;
  is_spam: boolean | null;
  status: string;
  replayed_from: string | null;
  org_id: number | null;
  created_at: string;

  static fromEntity(entity: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = entity.id;
    dto.to = entity.to;
    dto.from = entity.from;
    dto.message = entity.body;
    dto.otp = entity.otp;
    dto.category = entity.category;
    dto.is_spam = entity.isSpam;
    dto.status = entity.status;
    dto.replayed_from = entity.replayedFrom;
    dto.org_id = entity.orgId;
    dto.created_at = entity.createdAt.toISOString();
    return dto;
  }
}
