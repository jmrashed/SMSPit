import { defineConfig } from '@playwright/test';

// Runs against the live docker-compose stack (dashboard + gateway +
// auth-service + sms-service all up) -- there's no webServer entry here
// because Vite alone can't stand in for the whole stack these specs
// exercise. Start the stack yourself (`docker compose up -d`) before
// running `npm run test:e2e`.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'retain-on-failure',
  },
});
