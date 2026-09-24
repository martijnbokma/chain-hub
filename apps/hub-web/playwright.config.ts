import { defineConfig, devices } from "@playwright/test";

const PORT = 4390;

export default defineConfig({
  testDir: "./e2e",
  // All specs share one e2e server and hub (e2e/server.mjs). Running them in parallel lets one spec's
  // creates/renames change another's sync status mid-assertion (setup-wizard flaked ~40% of runs).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "on-first-retry"
  },
  webServer: {
    command: "vite build && node e2e/server.mjs",
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { E2E_PORT: String(PORT) }
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }]
});
