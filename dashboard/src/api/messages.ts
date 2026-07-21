import { apiFetch, apiFetchBlob } from './client';
import type { Message, MessageListResponse } from '../types/message';

function toQueryString(params: object): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params) as [string, string | number | boolean | undefined][]) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

export interface ListMessagesParams {
  to?: string;
  from?: string;
  category?: string;
  is_spam?: boolean;
  limit?: number;
  offset?: number;
  created_after?: string;
  created_before?: string;
}

export function listMessages(params: ListMessagesParams = {}): Promise<MessageListResponse> {
  return apiFetch<MessageListResponse>(`/api/v1/messages${toQueryString(params)}`);
}

export interface ExportMessagesParams {
  format: 'csv' | 'json';
  to?: string;
  from?: string;
  created_after?: string;
  created_before?: string;
}

// Same filters as listMessages, so exporting reflects whatever the
// inbox's search/filter bar currently shows.
export function exportMessages(params: ExportMessagesParams): Promise<{ blob: Blob; filename: string }> {
  return apiFetchBlob(`/api/v1/messages/export${toQueryString(params)}`);
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

export function setMessageSpam(id: string, isSpam: boolean): Promise<Message> {
  return apiFetch<Message>(`/api/v1/messages/${id}/spam`, {
    method: 'PATCH',
    body: JSON.stringify({ is_spam: isSpam }),
  });
}
