import { test, expect } from '@playwright/test';

// Covers Day 103 (observability nav links). These are plain external
// links (target="_blank"), not internal routes, so the test checks the
// menu's href values rather than navigating through them.

test('observability menu links to Jaeger, Prometheus, and Grafana', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Observability' }).click();

  const jaeger = page.getByRole('link', { name: 'Jaeger (traces)' });
  const prometheus = page.getByRole('link', { name: 'Prometheus (metrics)' });
  const grafana = page.getByRole('link', { name: 'Grafana (dashboards)' });

  await expect(jaeger).toHaveAttribute('href', 'http://localhost:16686');
  await expect(jaeger).toHaveAttribute('target', '_blank');
  await expect(prometheus).toHaveAttribute('href', 'http://localhost:9090');
  await expect(grafana).toHaveAttribute('href', 'http://localhost:3001');

  // Each link should actually resolve (the tools are really running),
  // not just be present in the DOM with a plausible-looking URL.
  for (const url of [
    'http://localhost:16686',
    'http://localhost:9090',
    'http://localhost:3001',
  ]) {
    const response = await page.request.get(url);
    expect(response.ok(), `${url} should respond OK`).toBeTruthy();
  }
});
