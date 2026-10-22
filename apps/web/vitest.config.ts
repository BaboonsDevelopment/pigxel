import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";
import { sharedTestOptions } from "@pigxel/vitest-config/base";
import { COVERAGE_THRESHOLDS } from "./coverage-thresholds";

const path = (relative: string) =>
  fileURLToPath(new URL(relative, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@test": path("./tests/support"),
      "@": path("./src"),
    },
  },
  test: {
    ...sharedTestOptions,
    projects: [
      {
        // Logic, server actions, route handlers and server-rendered markup.
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/**/*.test.ts"],
          exclude: [...configDefaults.exclude, "tests/db/**"],
          setupFiles: ["tests/support/setup.ts"],
        },
      },
      {
        // Client components rendered into jsdom with Testing Library.
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["tests/**/*.test.tsx"],
          setupFiles: ["tests/support/dom.ts", "tests/support/setup.ts"],
        },
      },
      {
        // Queries, row-level security and RPCs against local Supabase.
        extends: true,
        test: {
          name: "db",
          environment: "node",
          include: ["tests/db/**/*.test.ts"],
          globalSetup: ["tests/db/global-setup.ts"],
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts"],
      reporter: ["text-summary", "html", "lcov", "json-summary"],
      reportsDirectory: "coverage",
      thresholds: COVERAGE_THRESHOLDS,
    },
  },
});
