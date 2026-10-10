import { defineConfig } from "vitest/config";
import { sharedTestOptions } from "@pigxel/vitest-config/base";

export default defineConfig({
  test: {
    ...sharedTestOptions,
    environment: "jsdom",
    include: ["test/**/*.test.tsx"],
    setupFiles: ["test/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      reporter: ["text-summary", "html", "lcov"],
    },
  },
});
