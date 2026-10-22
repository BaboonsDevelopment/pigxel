import { screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { renderWithUser } from "@test/render";
import type { TestsSnapshot } from "@/features/test-runs/types";
vi.mock(
  "next/navigation",
  async () => (await import("@test/next")).navigationModule,
);
const mocks = vi.hoisted(() => ({
  snapshot: { data: undefined, error: null, isPending: false } as {
    data: TestsSnapshot | undefined;
    error: Error | null;
    isPending: boolean;
  },
  start: vi.fn(),
  stop: vi.fn(),
}));
vi.mock("@/features/test-runs/use-test-runs", () => ({
  useTestRuns: () => ({
    snapshot: mocks.snapshot,
    start: mocks.start,
    stop: mocks.stop,
  }),
}));
vi.mock("@/features/asset-review/use-asset-review", () => ({
  leaveReview: vi.fn(),
}));
import { TestRuns } from "@/features/test-runs/components/test-runs/test-runs";

const empty = { last: null, report: null, coverage: null };
const metric = (pct: number, threshold: number) => ({
  pct,
  covered: pct,
  total: 100,
  threshold,
});

function snapshot(overrides: Partial<TestsSnapshot> = {}): TestsSnapshot {
  return {
    run: null,
    suites: {
      unit: {
        last: {
          startedAt: "2026-10-21T10:00:00.000Z",
          finishedAt: "2026-10-21T10:01:00.000Z",
          exitCode: 1,
          stopped: false,
          log: "FAIL tests/export.test.ts",
        },
        report: {
          startedAt: "2026-10-21T10:00:00.000Z",
          durationMs: 42_000,
          totals: { passed: 760, failed: 1, skipped: 2, flaky: 0 },
          files: [
            {
              file: "tests/export.test.ts",
              status: "failed",
              failure: null,
              cases: [
                {
                  name: "keeps alpha",
                  path: ["export"],
                  project: null,
                  status: "failed",
                  durationMs: 3,
                  failure: "AssertionError: expected 1 to be 2",
                },
              ],
            },
            {
              file: "tests/hsv.test.ts",
              status: "passed",
              failure: null,
              cases: [],
            },
          ],
          errors: [],
        },
        coverage: null,
      },
      db: empty,
      e2e: empty,
      coverage: {
        ...empty,
        coverage: {
          at: "2026-10-21T10:00:00.000Z",
          totals: {
            lines: metric(30, 31),
            statements: metric(32, 31),
            functions: metric(25, 23),
            branches: metric(26, 25),
          },
          lowest: [{ file: "src/big.ts", pct: 0, covered: 0, total: 80 }],
        },
      },
    },
    ...overrides,
  };
}

beforeEach(() => {
  mocks.snapshot.data = snapshot();
  mocks.snapshot.error = null;
  mocks.start.mockResolvedValue(undefined);
  mocks.stop.mockResolvedValue(undefined);
});

it("summarizes every suite and leads with what failed", async () => {
  const { user } = renderWithUser(<TestRuns suite="unit" />);
  const cards = screen.getAllByRole("listitem").slice(0, 4);
  expect(within(cards[0]!).getByText("Failed")).toBeInTheDocument();
  expect(within(cards[0]!).getByText(/1 failed/)).toBeInTheDocument();
  expect(within(cards[1]!).getByText("Not run")).toBeInTheDocument();

  const failures = screen.getByRole("region", { name: "Failures" });
  expect(within(failures).getByText("export › keeps alpha")).toBeVisible();
  expect(
    within(failures).getByText("AssertionError: expected 1 to be 2"),
  ).toBeVisible();

  // Only failed files at first; every file on request.
  expect(screen.queryByText("tests/hsv.test.ts")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "All 2" }));
  expect(screen.getByText("tests/hsv.test.ts")).toBeInTheDocument();
});

it("runs a suite and shows why it couldn't", async () => {
  const { user } = renderWithUser(<TestRuns suite="unit" />);
  await user.click(screen.getByRole("button", { name: "Run Database" }));
  expect(mocks.start).toHaveBeenCalledWith("db");

  mocks.start.mockRejectedValueOnce(new Error("Tests are already running."));
  await user.click(screen.getByRole("button", { name: "Run End-to-end" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Tests are already running.",
  );
});

it("streams a running suite and can stop it", async () => {
  mocks.snapshot.data = snapshot({
    run: {
      suite: "e2e",
      startedAt: new Date().toISOString(),
      log: "Running 12 tests",
    },
  });
  const { user } = renderWithUser(<TestRuns suite="unit" />);
  expect(screen.getByLabelText("Live output")).toHaveTextContent(
    "Running 12 tests",
  );
  for (const button of screen.getAllByRole("button", { name: /^Run / }))
    expect(button).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Stop" }));
  expect(mocks.stop).toHaveBeenCalled();
});

it("shows coverage against its floors", () => {
  renderWithUser(<TestRuns suite="coverage" />);
  const panel = screen.getByRole("region", { name: "Coverage" });
  expect(within(panel).getByText("30.0%")).toBeInTheDocument();
  expect(within(panel).getByText(/floor 31% — below/)).toBeInTheDocument();
  expect(within(panel).getByText("src/big.ts")).toBeInTheDocument();
});

it("explains a suite that never ran here", () => {
  renderWithUser(<TestRuns suite="db" />);
  expect(
    screen.getByText("Database hasn’t run from here yet"),
  ).toBeInTheDocument();
});
