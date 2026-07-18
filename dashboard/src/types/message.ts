export type MessageStatus = 'captured' | 'failed';

export interface Message {
  id: string;
  to: string;
  from: string;
  message: string;
  status: MessageStatus;
  created_at: string;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  limit: number;
  offset: number;
}
