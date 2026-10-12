import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { localSupabase } from "../../tests/support/local-supabase.ts";

export const E2E_PORT = 3100;
export const BASE_URL = `http://localhost:${E2E_PORT}`;

const APP_DIR = fileURLToPath(new URL("../../", import.meta.url));

/** Names of every variable the app's env files set. */
function envFileKeys() {
  const files = [
    ".env.example",
    ".env",
    ".env.local",
    ".env.production",
    ".env.production.local",
  ];
  return files
    .map((file) => `${APP_DIR}${file}`)
    .filter((path) => existsSync(path))
    .flatMap(
      (path) =>
        readFileSync(path, "utf8").match(/^[A-Z][A-Z0-9_]*(?==)/gm) ?? [],
    );
}

/**
 * Environment for the app under test. Next.js loads apps/web/.env* (the
 * hosted project), but never overrides a variable that is already set, so
 * every key from those files is set here: blank, or pointed at local Supabase.
 */
export function serverEnv(): Record<string, string> {
  const supabase = localSupabase();
  return {
    ...Object.fromEntries(envFileKeys().map((key) => [key, ""])),
    NEXT_PUBLIC_SUPABASE_URL: supabase.url,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabase.publishableKey,
    SUPABASE_SECRET_KEY: supabase.secretKey,
    APP_URL: BASE_URL,
    // Pricing refuses to render without Paddle settings; these never reach
    // Paddle because the tests block every non-local request.
    PADDLE_ENVIRONMENT: "sandbox",
    PADDLE_CLIENT_TOKEN: "test_e2e_placeholder",
    NEXT_DIST_DIR: ".next-e2e",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}
