import { authenticatedAuthApiFetch } from './client';
import type { Organization, Team } from '../types/organization';

export function listOrganizations(): Promise<{ organizations: Organization[] }> {
  return authenticatedAuthApiFetch('/api/organizations');
}

export function listTeams(organizationId: number): Promise<{ teams: Team[] }> {
  return authenticatedAuthApiFetch(`/api/organizations/${organizationId}/teams`);
}
