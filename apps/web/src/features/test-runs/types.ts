export type SuiteId = "unit" | "db" | "e2e" | "coverage";

export type CaseStatus = "passed" | "failed" | "skipped" | "flaky";

export type TestCase = {
  name: string;
  /** describe() titles around the test, outermost first. */
  path: string[];
  /** Playwright project the test ran in; null for Vitest. */
  project: string | null;
  status: CaseStatus;
  durationMs: number | null;
  failure: string | null;
};

export type TestFile = {
  /** Relative to apps/web (Vitest) or the e2e folder (Playwright). */
  file: string;
  status: "passed" | "failed" | "skipped";
  /** An error that stopped the whole file, such as a failed import. */
  failure: string | null;
  cases: TestCase[];
};

export type TestReport = {
  startedAt: string | null;
  durationMs: number | null;
  totals: Record<CaseStatus, number>;
  files: TestFile[];
  /** Errors outside any test, such as a web server that never started. */
  errors: string[];
};

export type CoverageMetric = "lines" | "statements" | "functions" | "branches";

export type CoverageFile = {
  file: string;
  pct: number;
  covered: number;
  total: number;
};

export type CoverageReport = {
  at: string;
  totals: Record<
    CoverageMetric,
    { pct: number; covered: number; total: number; threshold: number | null }
  >;
  /** Least-covered source files by lines, worst first. */
  lowest: CoverageFile[];
};

export type LastRun = {
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  stopped: boolean;
  log: string;
};

export type SuiteResult = {
  last: LastRun | null;
  report: TestReport | null;
  coverage: CoverageReport | null;
};

export type ActiveRun = {
  suite: SuiteId;
  startedAt: string;
  log: string;
};

export type TestsSnapshot = {
  run: ActiveRun | null;
  suites: Record<SuiteId, SuiteResult>;
};
