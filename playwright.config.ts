import { defineConfig } from "@playwright/test";

/**
 * Playwright E2E configuration for FamilyCart.
 *
 * CI note: To run against the Firestore emulator, set
 *   VITE_FIRESTORE_EMULATOR_HOST=localhost:8080
 * in the environment and start the emulator before running tests:
 *   firebase emulators:start --only firestore
 *
 * To run headed locally:
 *   PWHEADLESS=false npx playwright test
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    headless: process.env.PWHEADLESS !== "false",
    actionTimeout: 10_000,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
