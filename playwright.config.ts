import { defineConfig, devices } from "@playwright/test";

const screenshots = process.env.SCREENSHOTS === "1";

export default defineConfig({
  testDir: "e2e",
  testMatch: screenshots ? /screenshots\.spec\.ts/ : /jobflow\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: "http://127.0.0.1:43123",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run start -- --port 43123",
    url: "http://127.0.0.1:43123",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
