"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@pigxel/ui/components/badge";
import { Button } from "@pigxel/ui/components/button";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { leaveReview } from "@/features/asset-review/use-asset-review";
import { SUITES } from "../../constants";
import type { SuiteId, SuiteResult } from "../../types";
import { useTestRuns } from "../../use-test-runs";
import { RunLog } from "./components/run-log";
import { SuiteDetail } from "./components/suite-detail";
import {
  formatDuration,
  formatWhen,
  STATE_LABELS,
  suiteState,
  testsHref,
  type SuiteState,
} from "./helpers";

const EMPTY: SuiteResult = { last: null, report: null, coverage: null };

function StateBadge({ state }: { state: SuiteState }) {
  return (
    <Badge
      size="md"
      tone={
        state === "passed"
          ? "success"
          : state === "running"
            ? "lavender"
            : "muted"
      }
      className={cn(
        (state === "failed" || state === "crashed") &&
          "bg-destructive/10 text-destructive",
      )}
    >
      {STATE_LABELS[state]}
    </Badge>
  );
}

export function TestRuns({ suite }: { suite: SuiteId }) {
  const { snapshot, start, stop } = useTestRuns();
  const [error, setError] = useState("");
  const run = snapshot.data?.run ?? null;
  const resultOf = (id: SuiteId) => snapshot.data?.suites[id] ?? EMPTY;
  const selected = SUITES.find((s) => s.id === suite)!;

  const act = async (action: () => Promise<unknown>) => {
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Heading
            as="h1"
            className="text-[2.5rem] leading-[1.1] font-semibold"
          >
            Tests
          </Heading>
          <p className="mt-1 text-xs text-muted-foreground">
            Run the suites on this machine and read what failed.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/internal/assets"
            className="flex h-10 items-center rounded-lg border bg-background px-3.5 text-sm hover:bg-muted"
          >
            Asset review
          </Link>
          <Button
            type="button"
            variant="secondary"
            className="h-10"
            onClick={leaveReview}
          >
            Lock
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-3 empty:hidden">
        {error && <Notice tone="error">{error}</Notice>}
        {snapshot.error && (
          <Notice tone="error">{snapshot.error.message}</Notice>
        )}
      </div>

      <ul className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SUITES.map(({ id, label, hint }) => {
          const result = resultOf(id);
          const state = suiteState(id, result, run);
          const totals = result.report?.totals;
          return (
            <li
              key={id}
              className={cn(
                "flex flex-col gap-3 rounded-xl border bg-card p-4",
                id === suite && "ring-2 ring-primary",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={testsHref(id)}
                  scroll={false}
                  aria-current={id === suite ? "page" : undefined}
                  className="font-medium hover:underline"
                >
                  {label}
                </Link>
                <StateBadge state={state} />
              </div>
              <p className="text-xs text-muted-foreground">{hint}</p>
              <p className="font-mono text-[11px] text-muted-foreground tabular-nums">
                {totals ? (
                  <>
                    <span className="text-success">{totals.passed} passed</span>
                    {totals.failed > 0 && (
                      <span className="text-destructive">
                        {" "}
                        · {totals.failed} failed
                      </span>
                    )}
                    {totals.flaky > 0 && ` · ${totals.flaky} flaky`}
                    {totals.skipped > 0 && ` · ${totals.skipped} skipped`}
                    {` · ${formatDuration(result.report!.durationMs)}`}
                  </>
                ) : (
                  "No results"
                )}
              </p>
              <div className="mt-auto flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {formatWhen(
                    result.last?.finishedAt ?? result.report?.startedAt ?? null,
                  )}
                </span>
                <Button
                  type="button"
                  size="sm"
                  disabled={!!run || snapshot.isPending}
                  onClick={() => act(() => start(id))}
                >
                  Run {label}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {run && (
        <section
          aria-label="Current run"
          className="mb-8 flex flex-col gap-3 rounded-xl border bg-card p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium">
              Running {SUITES.find((s) => s.id === run.suite)?.label}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                started {formatWhen(run.startedAt)}
              </span>
            </p>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={() => act(stop)}
            >
              Stop
            </Button>
          </div>
          <RunLog text={run.log} label="Live output" />
        </section>
      )}

      <SuiteDetail
        label={selected.label}
        state={suiteState(suite, resultOf(suite), run)}
        result={resultOf(suite)}
      />
    </Page>
  );
}
