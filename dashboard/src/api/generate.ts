import { aiApiFetch } from './client';

export interface GeneratedMessage {
  to: string;
  from: string;
  message: string;
  type: string;
}

export interface GenerateTestDataParams {
  count: number;
  type?: string;
}

export function generateTestData(params: GenerateTestDataParams): Promise<{ messages: GeneratedMessage[] }> {
  return aiApiFetch<{ messages: GeneratedMessage[] }>('/generate-test-data', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}
