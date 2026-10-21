/**
 * Turns what Vitest's json reporter, Playwright's json reporter and
 * Istanbul's json-summary write into one shape for the internal tests page.
 * Each parser takes the parsed file as `unknown` and returns null when it
 * isn't the expected report, so a half-written or foreign file shows as
 * "no report" instead of crashing the page.
 */
import type {
  CaseStatus,
  CoverageMetric,
  CoverageReport,
  TestCase,
  TestFile,
  TestReport,
} from "./types";

const METRICS: CoverageMetric[] = [
  "lines",
  "statements",
  "functions",
  "branches",
];
/** Files shorter than this are noise in the least-covered list. */
const MIN_LINES = 10;
const LOWEST = 15;

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;
export const stripAnsi = (text: string) => text.replace(ANSI, "");

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

/** Forward slashes, relative to `root` when the file is inside it. */
export function relativePath(file: string, root: string) {
  const path = file.replace(/\\/g, "/");
  const base = root.replace(/\\/g, "/").replace(/\/?$/, "/");
  return path.toLowerCase().startsWith(base.toLowerCase())
    ? path.slice(base.length)
    : path;
}

function emptyTotals(): Record<CaseStatus, number> {
  return { passed: 0, failed: 0, skipped: 0, flaky: 0 };
}

function fileStatus(
  cases: TestCase[],
  failure: string | null,
): TestFile["status"] {
  if (failure || cases.some((c) => c.status === "failed")) return "failed";
  if (cases.length && cases.every((c) => c.status === "skipped"))
    return "skipped";
  return "passed";
}

function summarize(
  files: TestFile[],
  startedAt: string | null,
  durationMs: number | null,
  errors: string[],
): TestReport {
  const totals = emptyTotals();
  for (const file of files) for (const c of file.cases) totals[c.status] += 1;
  // Failed files come first, then by name, so problems lead the page.
  files.sort(
    (a, b) =>
      Number(b.status === "failed") - Number(a.status === "failed") ||
      a.file.localeCompare(b.file),
  );
  return { startedAt, durationMs, totals, files, errors };
}

const vitestStatus = (status: unknown): CaseStatus =>
  status === "passed" ? "passed" : status === "failed" ? "failed" : "skipped";

export function fromVitest(json: unknown, root: string): TestReport | null {
  if (!isObject(json) || !Array.isArray(json.testResults)) return null;
  const start = number(json.startTime);
  let end = start;
  const files = json.testResults.filter(isObject).map((result): TestFile => {
    const cases = list(result.assertionResults)
      .filter(isObject)
      .map((a): TestCase => ({
        name: text(a.title),
        path: list(a.ancestorTitles).map(text),
        project: null,
        status: vitestStatus(a.status),
        durationMs: number(a.duration),
        failure:
          list(a.failureMessages).map(text).map(stripAnsi).join("\n\n") || null,
      }));
    const fileEnd = number(result.endTime);
    if (fileEnd !== null && (end === null || fileEnd > end)) end = fileEnd;
    // Vitest reports a file-level message only when the file itself broke.
    const message = stripAnsi(text(result.message)).trim();
    const failure =
      result.status === "failed" && message && !cases.some((c) => c.failure)
        ? message
        : null;
    return {
      file: relativePath(text(result.name), root),
      status: fileStatus(cases, failure),
      failure,
      cases,
    };
  });
  return summarize(
    files,
    start === null ? null : new Date(start).toISOString(),
    start === null || end === null ? null : end - start,
    [],
  );
}

const playwrightStatus = (status: unknown): CaseStatus =>
  status === "expected"
    ? "passed"
    : status === "unexpected"
      ? "failed"
      : status === "flaky"
        ? "flaky"
        : "skipped";

function errorText(result: Record<string, unknown>) {
  const errors = list(result.errors)
    .filter(isObject)
    .map((e) => text(e.message));
  const main = isObject(result.error) ? text(result.error.message) : "";
  const all = errors.length ? errors : [main];
  return stripAnsi(all.filter(Boolean).join("\n\n")) || null;
}

export function fromPlaywright(json: unknown): TestReport | null {
  if (!isObject(json) || !Array.isArray(json.suites)) return null;
  const byFile = new Map<string, TestCase[]>();

  const walk = (suite: Record<string, unknown>, path: string[]) => {
    const file = text(suite.file);
    const cases = byFile.get(file) ?? [];
    byFile.set(file, cases);
    for (const spec of list(suite.specs).filter(isObject))
      for (const test of list(spec.tests).filter(isObject)) {
        const results = list(test.results).filter(isObject);
        const last = results.at(-1);
        const status = playwrightStatus(test.status);
        cases.push({
          name: text(spec.title),
          path,
          project: text(test.projectName) || null,
          status,
          durationMs: last ? number(last.duration) : null,
          // A flaky test's last attempt passed: show why the first failed.
          failure:
            status === "failed" || status === "flaky"
              ? (results.map(errorText).find(Boolean) ?? null)
              : null,
        });
      }
    for (const child of list(suite.suites).filter(isObject))
      walk(child, [...path, text(child.title)]);
  };
  // Top-level suites are files; their title is the file name, not a describe().
  for (const suite of json.suites.filter(isObject)) walk(suite, []);

  const files = [...byFile]
    .filter(([, cases]) => cases.length)
    .map(([file, cases]): TestFile => ({
      file,
      status: fileStatus(cases, null),
      failure: null,
      cases,
    }));
  const stats = isObject(json.stats) ? json.stats : {};
  const errors = list(json.errors)
    .filter(isObject)
    .map((e) => stripAnsi(text(e.message)))
    .filter(Boolean);
  return summarize(
    files,
    text(stats.startTime) || null,
    number(stats.duration),
    errors,
  );
}

type Counts = { pct: number; covered: number; total: number };

function counts(value: unknown): Counts | null {
  if (!isObject(value)) return null;
  const pct = number(value.pct);
  const covered = number(value.covered);
  const total = number(value.total);
  return pct === null || covered === null || total === null
    ? null
    : { pct, covered, total };
}

export function fromCoverage(
  json: unknown,
  root: string,
  at: string,
  thresholds: Partial<Record<CoverageMetric, number>>,
): CoverageReport | null {
  if (!isObject(json) || !isObject(json.total)) return null;
  const total = json.total;
  const totals = {} as CoverageReport["totals"];
  for (const metric of METRICS) {
    const value = counts(total[metric]);
    if (!value) return null;
    totals[metric] = { ...value, threshold: thresholds[metric] ?? null };
  }
  const lowest = Object.entries(json)
    .filter(([key]) => key !== "total")
    .flatMap(([file, value]) => {
      const lines = isObject(value) ? counts(value.lines) : null;
      return lines && lines.total >= MIN_LINES
        ? [{ file: relativePath(file, root), ...lines }]
        : [];
    })
    .sort((a, b) => a.pct - b.pct || b.total - a.total)
    .slice(0, LOWEST);
  return { at, totals, lowest };
}
