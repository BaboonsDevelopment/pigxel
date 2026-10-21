import type { SuiteId } from "./types";

export const TESTS_API = "/api/internal/tests";
export const TESTS_POLL_MS = 1500;
export const IDLE_POLL_MS = 10_000;

export const SUITES: { id: SuiteId; label: string; hint: string }[] = [
  { id: "unit", label: "Unit + DOM", hint: "Vitest unit and dom projects" },
  { id: "db", label: "Database", hint: "Needs local Supabase (pnpm db:start)" },
  {
    id: "e2e",
    label: "End-to-end",
    hint: "Playwright; needs local Supabase and builds the app",
  },
  {
    id: "coverage",
    label: "Coverage",
    hint: "Unit + DOM with coverage against the thresholds",
  },
];

export const SUITE_IDS = SUITES.map((suite) => suite.id);

export const isSuiteId = (value: unknown): value is SuiteId =>
  SUITE_IDS.includes(value as SuiteId);
