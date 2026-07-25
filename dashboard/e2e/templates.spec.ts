import { test, expect } from '@playwright/test';

// Covers Day 102 (standalone Templates page). Each test creates its own
// throwaway template with a unique name and deletes it at the end, so
// the suite is re-runnable without manual cleanup between runs.

function uniqueName(prefix: string): string {
  return `${prefix} ${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test('create, edit, and delete a template', async ({ page }) => {
  const name = uniqueName('E2E Template');
  const renamedName = `${name} Renamed`;

  await page.goto('/templates');

  await page.getByRole('button', { name: '+ New template' }).click();
  await page.getByLabel('Template name').fill(name);
  await page.getByLabel('Template body').fill('Your OTP is {{code}}. It expires in {{minutes}} minutes.');
  await expect(page.getByText('Detected variables: code, minutes')).toBeVisible();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Template created.')).toBeVisible();

  const row = page.locator('tr', { hasText: name });
  await expect(row).toBeVisible();
  await expect(row.getByText('code, minutes')).toBeVisible();

  await row.getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Template name').fill(renamedName);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Template updated.')).toBeVisible();
  await expect(page.locator('tr', { hasText: renamedName })).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('tr', { hasText: renamedName }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Template deleted.')).toBeVisible();
  await expect(page.locator('tr', { hasText: renamedName })).toHaveCount(0);
});

test('a template created on the Templates page is usable from Compose', async ({ page }) => {
  const name = uniqueName('E2E Cross-Page Template');

  await page.goto('/templates');
  await page.getByRole('button', { name: '+ New template' }).click();
  await page.getByLabel('Template name').fill(name);
  await page.getByLabel('Template body').fill('Hi {{name}}, welcome!');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Template created.')).toBeVisible();

  await page.goto('/compose');
  await expect(page.getByText(name)).toBeVisible();

  // Cleanup via the Templates page (the Compose picker's delete works
  // the same way, but this keeps the cleanup path independent of the
  // thing under test above it).
  await page.goto('/templates');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator('tr', { hasText: name }).getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByText('Template deleted.')).toBeVisible();
});
