import { describe, expect, it } from "vitest";
import {
  failuresOf,
  formatDuration,
  formatWhen,
  parseSuite,
  suiteState,
  testsHref,
} from "@/features/test-runs/components/test-runs/helpers";
import type {
  LastRun,
  SuiteResult,
  TestCase,
  TestReport,
} from "@/features/test-runs/types";

const aCase = (overrides: Partial<TestCase> = {}): TestCase => ({
  name: "works",
  path: [],
  project: null,
  status: "passed",
  durationMs: 1,
  failure: null,
  ...overrides,
});

const aReport = (overrides: Partial<TestReport> = {}): TestReport => ({
  startedAt: null,
  durationMs: null,
  totals: { passed: 1, failed: 0, skipped: 0, flaky: 0 },
  files: [
    { file: "a.test.ts", status: "passed", failure: null, cases: [aCase()] },
  ],
  errors: [],
  ...overrides,
});

const aLast = (overrides: Partial<LastRun> = {}): LastRun => ({
  startedAt: "2026-10-21T10:00:00.000Z",
  finishedAt: "2026-10-21T10:01:00.000Z",
  exitCode: 0,
  stopped: false,
  log: "",
  ...overrides,
});

const result = (overrides: Partial<SuiteResult> = {}): SuiteResult => ({
  last: null,
  report: null,
  coverage: null,
  ...overrides,
});

describe("suite state", () => {
  const running = { suite: "unit" as const, startedAt: "", log: "" };

  it("shows a running suite as running, whatever ran before", () => {
    expect(suiteState("unit", result({ report: aReport() }), running)).toBe(
      "running",
    );
    expect(suiteState("db", result(), running)).toBe("never");
  });

  it("passes only a clean report with a clean exit", () => {
    expect(
      suiteState("unit", result({ report: aReport(), last: aLast() }), null),
    ).toBe("passed");
    expect(suiteState("unit", result({ report: aReport() }), null)).toBe(
      "passed",
    );
  });

  it("fails on failed tests, outside errors or a failed exit", () => {
    const failed = aReport({
      totals: { passed: 0, failed: 1, skipped: 0, flaky: 0 },
    });
    expect(suiteState("unit", result({ report: failed }), null)).toBe("failed");
    expect(
      suiteState("e2e", result({ report: aReport({ errors: ["x"] }) }), null),
    ).toBe("failed");
    // Coverage under its thresholds: every test passed, the run did not.
    expect(
      suiteState(
        "coverage",
        result({ report: aReport(), last: aLast({ exitCode: 1 }) }),
        null,
      ),
    ).toBe("failed");
  });

  it("tells a stopped run from one that died without a report", () => {
    expect(
      suiteState("db", result({ last: aLast({ stopped: true }) }), null),
    ).toBe("stopped");
    expect(
      suiteState("db", result({ last: aLast({ exitCode: 1 }) }), null),
    ).toBe("crashed");
  });
});

it("lists broken files and failed or flaky tests", () => {
  const failures = failuresOf(
    aReport({
      files: [
        { file: "broken.ts", status: "failed", failure: "boom", cases: [] },
        {
          file: "mixed.ts",
          status: "failed",
          failure: null,
          cases: [
            aCase(),
            aCase({ status: "failed", failure: "nope" }),
            aCase({ status: "flaky", failure: "once" }),
            aCase({ status: "skipped" }),
          ],
        },
      ],
    }),
  );
  expect(failures.map((f) => [f.file, f.test?.status ?? null, f.text])).toEqual(
    [
      ["broken.ts", null, "boom"],
      ["mixed.ts", "failed", "nope"],
      ["mixed.ts", "flaky", "once"],
    ],
  );
});

it("formats durations and times for people", () => {
  expect(formatDuration(null)).toBe("—");
  expect(formatDuration(850.4)).toBe("850 ms");
  expect(formatDuration(12_340)).toBe("12.3 s");
  expect(formatDuration(245_000)).toBe("4 m 05 s");
  const now = Date.parse("2026-10-21T12:00:00.000Z");
  expect(formatWhen("2026-10-21T11:59:50.000Z", now)).toBe("just now");
  expect(formatWhen("2026-10-21T11:45:00.000Z", now)).toBe("15 min ago");
  expect(formatWhen("2026-10-21T09:00:00.000Z", now)).toBe("3 h ago");
  expect(formatWhen(null, now)).toBe("—");
  expect(formatWhen("garbage", now)).toBe("—");
});

it("reads the suite from the URL and links back to it", () => {
  expect(parseSuite("e2e")).toBe("e2e");
  expect(parseSuite("../etc")).toBe("unit");
  expect(parseSuite(undefined)).toBe("unit");
  expect(testsHref("unit")).toBe("/internal/tests");
  expect(testsHref("coverage")).toBe("/internal/tests?suite=coverage");
});
