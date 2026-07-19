import { apiFetch } from './client';
import type { Message, MessageListResponse } from '../types/message';

export interface ListMessagesParams {
  to?: string;
  from?: string;
  limit?: number;
  offset?: number;
  created_after?: string;
  created_before?: string;
}

export function listMessages(params: ListMessagesParams = {}): Promise<MessageListResponse> {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return apiFetch<MessageListResponse>(`/api/v1/messages${queryString ? `?${queryString}` : ''}`);
}

export function getMessage(id: string): Promise<Message> {
  return apiFetch<Message>(`/api/v1/messages/${id}`);
}

export function replayMessage(id: string): Promise<Message> {
  return apiFetch<Message>(`/api/v1/messages/${id}/replay`, { method: 'POST' });
}

export interface CreateMessageParams {
  to: string;
  from: string;
  message: string;
}

export function createMessage(params: CreateMessageParams): Promise<Message> {
  return apiFetch<Message>('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
