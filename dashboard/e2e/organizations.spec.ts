import { test, expect } from '@playwright/test';

// Covers Day 101 (org/team management UI). Each test creates its own
// throwaway organization with a unique name rather than relying on
// (or mutating) the seeded "Default Organization", so the suite is
// re-runnable without manual cleanup between runs.

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test('create, edit, and delete an organization', async ({ page }) => {
  const orgName = uniqueName('E2E Org');
  const renamedOrgName = `${orgName} Renamed`;

  await page.goto('/organizations');

  await page.getByRole('button', { name: '+ New organization' }).click();
  await page.getByLabel('New organization name').fill(orgName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  // The switcher should have auto-selected the org we just created.
  await expect(page.getByText('Organization created.')).toBeVisible();
  await expect(page.getByRole('heading', { name: orgName })).toBeVisible();

  await page.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Organization name').fill(renamedOrgName);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Organization updated.')).toBeVisible();
  await expect(page.getByRole('heading', { name: renamedOrgName })).toBeVisible();

  await page.getByRole('button', { name: 'Delete organization' }).click();
  await page.getByLabel('Type the organization name to confirm deletion').fill(renamedOrgName);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Organization deleted.')).toBeVisible();
  await expect(page.locator('option', { hasText: renamedOrgName })).toHaveCount(0);
});

test('deleting the selected org falls back to another org, not a blank page', async ({ page }) => {
  const orgName = uniqueName('E2E Fallback Org');

  await page.goto('/organizations');
  await page.getByRole('button', { name: '+ New organization' }).click();
  await page.getByLabel('New organization name').fill(orgName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Organization created.')).toBeVisible();

  await page.getByRole('button', { name: 'Delete organization' }).click();
  await page.getByLabel('Type the organization name to confirm deletion').fill(orgName);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Organization deleted.')).toBeVisible();

  // Regression check: the page must still render a working org context
  // (switcher + teams section), not go blank because selectedOrgId was
  // force-nulled while other orgs still exist.
  await expect(page.getByRole('combobox', { name: 'Organization' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Teams' })).toBeVisible();
});

test('create a team and add/remove a member', async ({ page }) => {
  const orgName = uniqueName('E2E Team Org');
  const teamName = uniqueName('Engineering');

  await page.goto('/organizations');
  await page.getByRole('button', { name: '+ New organization' }).click();
  await page.getByLabel('New organization name').fill(orgName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Organization created.')).toBeVisible();

  await page.getByLabel('New team name').fill(teamName);
  await page.getByRole('button', { name: '+ New team' }).click();
  await expect(page.getByText('Team created.')).toBeVisible();
  await expect(page.getByRole('heading', { name: teamName })).toBeVisible();

  // User ID 1 is the seeded "Dashboard" user (see auth-service's
  // OrganizationSeeder) -- always present in a freshly-seeded stack.
  await page.getByLabel(`Add member to ${teamName} by user ID`).fill('1');
  await page.getByRole('button', { name: 'Add member' }).click();
  await expect(page.getByText('Member added.')).toBeVisible();
  await expect(page.getByText('Dashboard', { exact: false })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Member removed.')).toBeVisible();
  await expect(page.getByText('No members yet.')).toBeVisible();

  // Cleanup.
  await page.getByRole('button', { name: 'Delete organization' }).click();
  await page.getByLabel('Type the organization name to confirm deletion').fill(orgName);
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText('Organization deleted.')).toBeVisible();
});
