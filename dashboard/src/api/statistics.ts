import { apiFetch } from './client';
import type { Statistics } from '../types/statistics';

export function getStatistics(): Promise<Statistics> {
  return apiFetch<Statistics>('/api/v1/statistics');
}
