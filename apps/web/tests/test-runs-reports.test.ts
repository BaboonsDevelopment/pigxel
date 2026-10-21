import { describe, expect, it } from "vitest";
import {
  fromCoverage,
  fromPlaywright,
  fromVitest,
  relativePath,
} from "@/features/test-runs/reports";

const ROOT = "C:\\repo\\apps\\web";
const RED = "\u001b[31m";
const RESET = "\u001b[39m";

const assertion = (overrides: Record<string, unknown> = {}) => ({
  ancestorTitles: ["layers"],
  fullName: "layers merges down",
  status: "passed",
  title: "merges down",
  duration: 2.5,
  failureMessages: [],
  meta: {},
  tags: [],
  ...overrides,
});

// The shape Vitest 4's json reporter writes, trimmed to what matters.
const vitestReport = {
  numTotalTests: 4,
  startTime: 1_000,
  success: false,
  testResults: [
    {
      name: "C:/repo/apps/web/tests/layers.test.ts",
      status: "passed",
      message: "",
      startTime: 1_100,
      endTime: 1_400,
      assertionResults: [
        assertion(),
        assertion({ title: "later", status: "todo", duration: null }),
      ],
    },
    {
      name: "C:/repo/apps/web/tests/broken.test.ts",
      status: "failed",
      message: `${RED}Error: ENOENT: no such file${RESET}`,
      startTime: 1_100,
      endTime: 1_200,
      assertionResults: [],
    },
    {
      name: "C:/repo/apps/web/tests/export.test.ts",
      status: "failed",
      message: "",
      startTime: 1_100,
      endTime: 2_500,
      assertionResults: [
        assertion({
          ancestorTitles: ["export", "png"],
          title: "keeps alpha",
          status: "failed",
          failureMessages: [`${RED}AssertionError: expected 1 to be 2${RESET}`],
        }),
        assertion({ title: "skipped one", status: "skipped" }),
      ],
    },
  ],
};

describe("Vitest reports", () => {
  const report = fromVitest(vitestReport, ROOT)!;

  it("counts every test by outcome", () => {
    expect(report.totals).toEqual({
      passed: 1,
      failed: 1,
      skipped: 2,
      flaky: 0,
    });
    expect(report.startedAt).toBe(new Date(1_000).toISOString());
    expect(report.durationMs).toBe(1_500);
  });

  it("lists failed files first with paths relative to the app", () => {
    expect(report.files.map((f) => [f.file, f.status])).toEqual([
      ["tests/broken.test.ts", "failed"],
      ["tests/export.test.ts", "failed"],
      ["tests/layers.test.ts", "passed"],
    ]);
  });

  it("keeps describe titles and failure messages without colour codes", () => {
    const failed = report.files[1]!.cases[0]!;
    expect(failed).toMatchObject({
      name: "keeps alpha",
      path: ["export", "png"],
      status: "failed",
      failure: "AssertionError: expected 1 to be 2",
    });
  });

  it("shows why a file broke before any test ran", () => {
    expect(report.files[0]!.failure).toBe("Error: ENOENT: no such file");
  });

  it("does not repeat a file message when its tests carry the failure", () => {
    const withBoth = fromVitest(
      {
        ...vitestReport,
        testResults: [
          {
            ...vitestReport.testResults[2],
            message: "1 test failed",
          },
        ],
      },
      ROOT,
    )!;
    expect(withBoth.files[0]!.failure).toBeNull();
  });

  it("refuses files that are not a Vitest report", () => {
    expect(fromVitest(null, ROOT)).toBeNull();
    expect(fromVitest({ suites: [] }, ROOT)).toBeNull();
    expect(fromVitest([], ROOT)).toBeNull();
  });

  it("marks a file of only skipped tests as skipped", () => {
    const skipped = fromVitest(
      {
        startTime: 0,
        testResults: [
          {
            name: "C:/repo/apps/web/tests/db/tiles.test.ts",
            status: "passed",
            message: "",
            assertionResults: [assertion({ status: "skipped" })],
          },
        ],
      },
      ROOT,
    )!;
    expect(skipped.files[0]!.status).toBe("skipped");
  });
});

const result = (status: string, message?: string) => ({
  status,
  duration: 120,
  error: message ? { message } : undefined,
  errors: message ? [{ message }] : [],
  retry: 0,
});

// The shape Playwright 1.64's json reporter writes, trimmed to what matters.
const playwrightReport = {
  config: {},
  suites: [
    {
      title: "guest/landing.spec.ts",
      file: "guest/landing.spec.ts",
      specs: [
        {
          title: "shows the hero",
          ok: true,
          tests: [
            {
              projectName: "guest",
              status: "expected",
              results: [result("passed")],
            },
            {
              projectName: "mobile",
              status: "skipped",
              results: [result("skipped")],
            },
          ],
        },
      ],
      suites: [
        {
          title: "pricing",
          file: "guest/landing.spec.ts",
          specs: [
            {
              title: "opens checkout",
              ok: false,
              tests: [
                {
                  projectName: "guest",
                  status: "unexpected",
                  results: [
                    result("failed", `${RED}Timed out${RESET}`),
                    result("failed", "Timed out again"),
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "signed-in/tiles.spec.ts",
      file: "signed-in/tiles.spec.ts",
      specs: [
        {
          title: "saves a tile",
          ok: true,
          tests: [
            {
              projectName: "signed-in",
              status: "flaky",
              results: [result("failed", "Detached"), result("passed")],
            },
          ],
        },
      ],
    },
  ],
  errors: [{ message: `${RED}Web server exited early${RESET}` }],
  stats: {
    startTime: "2026-10-21T10:00:00.000Z",
    duration: 61_000,
    expected: 1,
    unexpected: 1,
    flaky: 1,
    skipped: 1,
  },
};

describe("Playwright reports", () => {
  const report = fromPlaywright(playwrightReport)!;

  it("counts each project's run of a test", () => {
    expect(report.totals).toEqual({
      passed: 1,
      failed: 1,
      skipped: 1,
      flaky: 1,
    });
    expect(report.startedAt).toBe("2026-10-21T10:00:00.000Z");
    expect(report.durationMs).toBe(61_000);
  });

  it("groups nested describe blocks under their file", () => {
    const landing = report.files.find(
      (f) => f.file === "guest/landing.spec.ts",
    )!;
    expect(landing.status).toBe("failed");
    expect(landing.cases.map((c) => [c.path, c.name, c.project])).toEqual([
      [[], "shows the hero", "guest"],
      [[], "shows the hero", "mobile"],
      [["pricing"], "opens checkout", "guest"],
    ]);
  });

  it("shows the first failure, even for a test that passed on retry", () => {
    const landing = report.files[0]!;
    expect(landing.cases[2]!.failure).toBe("Timed out");
    const tiles = report.files.find(
      (f) => f.file === "signed-in/tiles.spec.ts",
    )!;
    expect(tiles.status).toBe("passed");
    expect(tiles.cases[0]).toMatchObject({
      status: "flaky",
      failure: "Detached",
    });
  });

  it("keeps errors from outside any test", () => {
    expect(report.errors).toEqual(["Web server exited early"]);
  });

  it("refuses files that are not a Playwright report", () => {
    expect(fromPlaywright({ testResults: [] })).toBeNull();
    expect(fromPlaywright("nope")).toBeNull();
  });
});

const counts = (covered: number, total: number) => ({
  total,
  covered,
  skipped: 0,
  pct: total ? Math.round((covered / total) * 10_000) / 100 : 100,
});
const fileCoverage = (covered: number, total: number) => ({
  lines: counts(covered, total),
  statements: counts(covered, total),
  functions: counts(1, 2),
  branches: counts(1, 2),
});

describe("coverage summaries", () => {
  const summary = {
    total: {
      lines: counts(300, 1000),
      statements: counts(320, 1000),
      functions: counts(40, 200),
      branches: counts(50, 200),
    },
    "C:\\repo\\apps\\web\\src\\a.ts": fileCoverage(0, 40),
    "C:\\repo\\apps\\web\\src\\b.ts": fileCoverage(0, 80),
    "C:\\repo\\apps\\web\\src\\tiny.ts": fileCoverage(0, 3),
    "C:\\repo\\apps\\web\\src\\full.ts": fileCoverage(50, 50),
  };
  const at = "2026-10-21T10:00:00.000Z";
  const thresholds = { lines: 31, statements: 31, functions: 23, branches: 25 };

  it("compares each total with its threshold", () => {
    const report = fromCoverage(summary, ROOT, at, thresholds)!;
    expect(report.at).toBe(at);
    expect(report.totals.lines).toEqual({
      pct: 30,
      covered: 300,
      total: 1000,
      threshold: 31,
    });
    expect(report.totals.statements.pct).toBe(32);
  });

  it("lists the least-covered files, largest first among ties", () => {
    const report = fromCoverage(summary, ROOT, at, thresholds)!;
    expect(report.lowest.map((f) => f.file)).toEqual([
      "src/b.ts",
      "src/a.ts",
      "src/full.ts",
    ]);
  });

  it("works without thresholds and refuses malformed summaries", () => {
    expect(
      fromCoverage(summary, ROOT, at, {})!.totals.branches.threshold,
    ).toBeNull();
    expect(fromCoverage({}, ROOT, at, thresholds)).toBeNull();
    expect(
      fromCoverage({ total: { lines: counts(1, 2) } }, ROOT, at, thresholds),
    ).toBeNull();
  });
});

describe("relative paths", () => {
  it("handles Windows paths in either slash and case", () => {
    expect(relativePath("c:/repo/apps/web/tests/a.test.ts", ROOT)).toBe(
      "tests/a.test.ts",
    );
    expect(relativePath("C:\\repo\\apps\\web\\src\\x.ts", `${ROOT}\\`)).toBe(
      "src/x.ts",
    );
    expect(relativePath("/elsewhere/x.ts", ROOT)).toBe("/elsewhere/x.ts");
  });
});
