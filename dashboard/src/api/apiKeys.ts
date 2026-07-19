import { authApiFetch } from './client';
import type { ApiKey } from '../types/apiKey';

export function listApiKeys(): Promise<{ api_keys: ApiKey[] }> {
  return authApiFetch('/api/api-keys');
}

export function createApiKey(params: { name: string; owner_id: number }): Promise<ApiKey> {
  return authApiFetch('/api/api-keys', { method: 'POST', body: JSON.stringify(params) });
}

export function revokeApiKey(id: number): Promise<ApiKey> {
  return authApiFetch(`/api/api-keys/${id}`, { method: 'DELETE' });
}
