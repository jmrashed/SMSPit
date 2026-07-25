import { authenticatedAuthApiFetch } from './client';
import type { Organization, Team } from '../types/organization';

export function listOrganizations(): Promise<{ organizations: Organization[] }> {
  return authenticatedAuthApiFetch('/api/organizations');
}

export function createOrganization(input: { name: string }): Promise<Organization> {
  return authenticatedAuthApiFetch('/api/organizations', { method: 'POST', body: JSON.stringify(input) });
}

export function updateOrganization(id: number, input: { name: string }): Promise<Organization> {
  return authenticatedAuthApiFetch(`/api/organizations/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteOrganization(id: number): Promise<void> {
  return authenticatedAuthApiFetch(`/api/organizations/${id}`, { method: 'DELETE' });
}

export function listTeams(organizationId: number): Promise<{ teams: Team[] }> {
  return authenticatedAuthApiFetch(`/api/organizations/${organizationId}/teams`);
}

export function createTeam(organizationId: number, input: { name: string }): Promise<Team> {
  return authenticatedAuthApiFetch(`/api/organizations/${organizationId}/teams`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function addTeamMember(organizationId: number, teamId: number, userId: number): Promise<Team> {
  return authenticatedAuthApiFetch(`/api/organizations/${organizationId}/teams/${teamId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function removeTeamMember(organizationId: number, teamId: number, userId: number): Promise<Team> {
  return authenticatedAuthApiFetch(`/api/organizations/${organizationId}/teams/${teamId}/members/${userId}`, {
    method: 'DELETE',
  });
}
