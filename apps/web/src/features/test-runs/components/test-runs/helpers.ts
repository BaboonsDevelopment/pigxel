import { isSuiteId } from "../../constants";
import type {
  SuiteId,
  SuiteResult,
  TestCase,
  TestReport,
  TestsSnapshot,
} from "../../types";

export type SuiteState =
  "running" | "passed" | "failed" | "stopped" | "crashed" | "never";

export const STATE_LABELS: Record<SuiteState, string> = {
  running: "Running",
  passed: "Passed",
  failed: "Failed",
  stopped: "Stopped",
  crashed: "No report",
  never: "Not run",
};

export const parseSuite = (value: string | undefined): SuiteId =>
  isSuiteId(value) ? value : "unit";

const failedReport = (report: TestReport) =>
  report.totals.failed > 0 ||
  report.errors.length > 0 ||
  report.files.some((file) => file.status === "failed");

export function suiteState(
  suite: SuiteId,
  result: SuiteResult,
  run: TestsSnapshot["run"],
): SuiteState {
  if (run?.suite === suite) return "running";
  const { last, report } = result;
  if (last?.stopped) return "stopped";
  if (report)
    // A clean report with a failed exit means the runner itself failed after
    // the tests, such as coverage under its thresholds.
    return failedReport(report) || (last && last.exitCode !== 0)
      ? "failed"
      : "passed";
  return last ? "crashed" : "never";
}

export type Failure = { file: string; test: TestCase | null; text: string };

/** Failed and flaky tests, plus files that broke before any test ran. */
export function failuresOf(report: TestReport): Failure[] {
  return report.files.flatMap((file) => [
    ...(file.failure
      ? [{ file: file.file, test: null, text: file.failure }]
      : []),
    ...file.cases
      .filter((c) => c.status === "failed" || c.status === "flaky")
      .map((c) => ({ file: file.file, test: c, text: c.failure ?? "" })),
  ]);
}

export const testTitle = (test: TestCase) =>
  [...test.path, test.name].filter(Boolean).join(" › ");

export function formatDuration(ms: number | null) {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)} m ${String(whole % 60).padStart(2, "0")} s`;
}

export function formatWhen(iso: string | null, now = Date.now()) {
  if (!iso) return "—";
  const at = Date.parse(iso);
  if (Number.isNaN(at)) return "—";
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(at).toLocaleString();
}

export const testsHref = (suite: SuiteId) =>
  suite === "unit" ? "/internal/tests" : `/internal/tests?suite=${suite}`;
