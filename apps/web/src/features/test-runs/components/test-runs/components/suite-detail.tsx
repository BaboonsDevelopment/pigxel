"use client";

import { useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Notice } from "@pigxel/ui/components/notice";
import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { PILL } from "@/features/asset-review/components/asset-review/constants";
import type { SuiteResult, TestFile } from "../../../types";
import {
  failuresOf,
  formatDuration,
  testTitle,
  type SuiteState,
} from "../helpers";
import { CoveragePanel } from "./coverage-panel";
import { RunLog } from "./run-log";

const CASE_MARK = { passed: "✓", failed: "✗", skipped: "○", flaky: "!" };
const CASE_TONE = {
  passed: "text-success",
  failed: "text-destructive",
  skipped: "text-muted-foreground",
  flaky: "text-amber-600",
};

function FileRow({ file }: { file: TestFile }) {
  return (
    <details className="group border-t first:border-t-0">
      <summary className="flex cursor-pointer items-center gap-3 px-4 py-2 text-xs hover:bg-muted/50">
        <span
          aria-hidden="true"
          className={cn("w-3 font-mono", CASE_TONE[file.status])}
        >
          {CASE_MARK[file.status]}
        </span>
        <span className="min-w-0 flex-1 font-mono break-all">{file.file}</span>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {file.cases.length} tests
        </span>
      </summary>
      <ul className="px-4 pb-3 pl-10">
        {file.cases.map((test, i) => (
          <li key={i} className="flex gap-2 py-0.5 text-xs">
            <span
              aria-label={test.status}
              className={cn("w-3 shrink-0 font-mono", CASE_TONE[test.status])}
            >
              {CASE_MARK[test.status]}
            </span>
            <span className="min-w-0 flex-1">
              {testTitle(test)}
              {test.project && (
                <span className="ml-2 text-muted-foreground">
                  [{test.project}]
                </span>
              )}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
              {formatDuration(test.durationMs)}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export function SuiteDetail({
  label,
  state,
  result,
}: {
  label: string;
  state: SuiteState;
  result: SuiteResult;
}) {
  const [all, setAll] = useState(false);
  const { report, last, coverage } = result;
  const failures = report ? failuresOf(report) : [];
  const files = report
    ? all
      ? report.files
      : report.files.filter((f) => f.status === "failed")
    : [];

  return (
    <section aria-label={`${label} results`} className="flex flex-col gap-6">
      {coverage && <CoveragePanel coverage={coverage} />}

      {state === "crashed" && (
        <Notice tone="error">
          The last run ended without a report — see its output below.
        </Notice>
      )}
      {state === "never" && !coverage && (
        <EmptyState
          title={`${label} hasn’t run from here yet`}
          description="Run it above; results are kept until the next run."
        />
      )}

      {report && report.errors.length > 0 && (
        <Notice tone="error">
          <pre className="overflow-x-auto font-mono text-xs whitespace-pre-wrap">
            {report.errors.join("\n\n")}
          </pre>
        </Notice>
      )}

      {failures.length > 0 && (
        <section aria-label="Failures" className="flex flex-col gap-3">
          <Heading as="h2" size="section">
            Failures
            <span className="ml-2 font-mono text-sm text-muted-foreground">
              {failures.length}
            </span>
          </Heading>
          <ul className="flex flex-col gap-3">
            {failures.map((failure, i) => (
              <li
                key={i}
                className="overflow-hidden rounded-xl border border-destructive/30 bg-card"
              >
                <p className="border-b bg-destructive/5 px-4 py-2 text-xs">
                  <span className="font-mono text-muted-foreground">
                    {failure.file}
                  </span>
                  <span className="block font-medium">
                    {failure.test
                      ? testTitle(failure.test)
                      : "The file failed to run"}
                    {failure.test?.project && ` [${failure.test.project}]`}
                    {failure.test?.status === "flaky" && " — flaky"}
                  </span>
                </p>
                <pre className="max-h-72 overflow-auto p-4 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {failure.text || "No message."}
                </pre>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report && (
        <section aria-labelledby="files-title" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Heading as="h2" size="section" id="files-title">
              Files
            </Heading>
            <div role="group" aria-label="Files shown" className="flex gap-2">
              <button
                type="button"
                aria-pressed={!all}
                onClick={() => setAll(false)}
                className={PILL}
              >
                Failed
              </button>
              <button
                type="button"
                aria-pressed={all}
                onClick={() => setAll(true)}
                className={PILL}
              >
                All {report.files.length}
              </button>
            </div>
          </div>
          {files.length ? (
            <div className="rounded-xl border bg-card">
              {files.map((file) => (
                <FileRow key={file.file} file={file} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No failed files. 🎉</p>
          )}
        </section>
      )}

      {last && state !== "running" && (
        <details>
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Output of the last run
            {last.exitCode !== null && ` (exit code ${last.exitCode})`}
          </summary>
          <div className="mt-2">
            <RunLog text={last.log} label="Output of the last run" />
          </div>
        </details>
      )}
    </section>
  );
}
