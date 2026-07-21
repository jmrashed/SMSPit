export type MessageStatus = 'captured' | 'failed';
export type MessageCategory = 'otp' | 'transactional' | 'marketing' | 'other';

export interface Message {
  id: string;
  to: string;
  from: string;
  message: string;
  otp: string | null;
  category: MessageCategory | null;
  is_spam: boolean | null;
  status: MessageStatus;
  replayed_from: string | null;
  created_at: string;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}
