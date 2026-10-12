import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE } from "./e2e/support/accounts";
import { BASE_URL } from "./e2e/support/server";
import { localSupabase } from "./tests/support/local-supabase";

const CI = Boolean(process.env.CI);
// "prod" (default) tests a production build like users get; "dev" starts
// faster for local iteration.
const server = process.env.E2E_SERVER ?? "prod";
// Fails fast unless local Supabase runs; workers inherit what it finds.
localSupabase();

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 2 : 0,
  workers: CI ? 2 : undefined,
  timeout: server === "dev" ? 60_000 : 30_000,
  expect: { timeout: server === "dev" ? 15_000 : 5_000 },
  reporter: CI
    ? [["github"], ["list"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "auth.setup.ts",
      teardown: "cleanup",
    },
    { name: "cleanup", testMatch: "auth.teardown.ts" },
    {
      name: "guest",
      testMatch: "guest/**/*.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "signed-in",
      testMatch: "signed-in/**/*.spec.ts",
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE },
    },
    {
      name: "mobile",
      testMatch: "guest/**/*.spec.ts",
      grep: /@mobile/,
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: `node e2e/support/serve.ts ${server}`,
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 300_000,
    stdout: "pipe",
  },
});
