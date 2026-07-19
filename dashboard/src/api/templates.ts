import { apiFetch } from './client';
import type { Template } from '../types/template';

export interface TemplateInput {
  name: string;
  body: string;
  variables: string[];
}

export function listTemplates(): Promise<{ templates: Template[] }> {
  return apiFetch<{ templates: Template[] }>('/api/v1/templates');
}

export function createTemplate(input: TemplateInput): Promise<Template> {
  return apiFetch<Template>('/api/v1/templates', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateTemplate(id: number, input: TemplateInput): Promise<Template> {
  return apiFetch<Template>(`/api/v1/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteTemplate(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/templates/${id}`, { method: 'DELETE' });
}
