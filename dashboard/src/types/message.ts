export type MessageStatus = 'captured' | 'failed';

export interface Message {
  id: string;
  to: string;
  from: string;
  message: string;
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
