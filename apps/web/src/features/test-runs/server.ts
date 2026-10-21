import "server-only";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ReviewError } from "@/features/asset-review/server";
import { COVERAGE_THRESHOLDS } from "../../../coverage-thresholds.ts";
import { isSuiteId, SUITE_IDS } from "./constants";
import { fromCoverage, fromPlaywright, fromVitest, stripAnsi } from "./reports";
import type { LastRun, SuiteId, SuiteResult, TestsSnapshot } from "./types";

/** Live output kept in memory and sent on every poll. */
const LOG_LIMIT = 100_000;
/** Output saved with a finished run, for reading after a restart. */
const SAVED_LOG = 20_000;
const RUN_TIMEOUT = 30 * 60 * 1000;
/** The env files `next dev` loads; a terminal test run has none of them. */
const NEXT_ENV_FILES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
];
/** Variables Next sets for itself that would leak into a nested next build. */
const NEXT_INTERNAL = /^(NODE_ENV|NEXT_RUNTIME|TURBOPACK|__NEXT|NEXT_PRIVATE)/;

// Paths follow the working directory, apps/web under `next dev` and Vitest.
const appDir = () => process.cwd();
const reportDir = () => join(appDir(), ".test-runs");
const reportFile = (suite: SuiteId) => join(reportDir(), `${suite}.json`);
const lastFile = (suite: SuiteId) => join(reportDir(), `${suite}.last.json`);
const coverageFile = () => join(appDir(), "coverage", "coverage-summary.json");

type Run = {
  suite: SuiteId;
  startedAt: string;
  log: string;
  child: ChildProcess;
  stopped: boolean;
};

// Kept on globalThis so a dev reload of this module still sees the run it
// started, and never starts a second one alongside it.
const state = globalThis as typeof globalThis & { pigxelTestRun?: Run };

export function commandFor(suite: SuiteId, dir = appDir()): string[] {
  const vitest = (...args: string[]) => [
    join(dir, "node_modules", "vitest", "vitest.mjs"),
    "run",
    ...args,
    "--reporter=default",
    "--reporter=json",
    `--outputFile.json=${join(dir, ".test-runs", `${suite}.json`)}`,
  ];
  switch (suite) {
    case "unit":
      return vitest("--project", "unit", "--project", "dom");
    case "db":
      return vitest("--project", "db");
    case "coverage":
      // Without reportOnFailure one failing test leaves no coverage to show.
      return vitest(
        "--project",
        "unit",
        "--project",
        "dom",
        "--coverage",
        "--coverage.reportOnFailure",
      );
    case "e2e":
      return [
        join(dir, "node_modules", "@playwright", "test", "cli.js"),
        "test",
        "--reporter=list,json,html",
      ];
  }
}

function envFileKeys(dir: string) {
  return NEXT_ENV_FILES.map((file) => join(dir, file))
    .filter((path) => existsSync(path))
    .flatMap(
      (path) =>
        readFileSync(path, "utf8").match(/^[A-Z][A-Z0-9_]*(?==)/gm) ?? [],
    );
}

/**
 * The environment a terminal `pnpm test` would see: without what `next dev`
 * loaded from apps/web/.env* (the hosted project's keys) or set for itself.
 */
export function childEnv(suite: SuiteId, dir = appDir()): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of envFileKeys(dir)) delete env[key];
  for (const key of Object.keys(env))
    if (NEXT_INTERNAL.test(key)) delete env[key];
  return {
    ...env,
    FORCE_COLOR: "0",
    NO_COLOR: "1",
    PLAYWRIGHT_HTML_OPEN: "never",
    PLAYWRIGHT_JSON_OUTPUT_NAME: join(dir, ".test-runs", `${suite}.json`),
  };
}

function kill(child: ChildProcess) {
  if (child.pid === undefined || child.exitCode !== null) return;
  // Playwright starts a web server and browsers: stop the whole tree.
  if (process.platform === "win32")
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
  else
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
}

export function startRun(suite: unknown) {
  if (!isSuiteId(suite)) throw new ReviewError("Unknown test suite.");
  if (state.pigxelTestRun)
    throw new ReviewError("Tests are already running.", 409);
  mkdirSync(reportDir(), { recursive: true });
  // A run that dies before reporting must not show the last run's results.
  rmSync(reportFile(suite), { force: true });

  const startedAt = new Date().toISOString();
  const child = spawn(process.execPath, commandFor(suite), {
    cwd: appDir(),
    env: childEnv(suite),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    // Its own process group, so kill() can stop the tree outside Windows.
    detached: process.platform !== "win32",
  });
  const run: Run = { suite, startedAt, log: "", child, stopped: false };
  state.pigxelTestRun = run;

  const append = (text: string) => {
    run.log = (run.log + stripAnsi(text)).slice(-LOG_LIMIT);
  };
  child.stdout?.on("data", (chunk: Buffer) => append(chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => append(chunk.toString()));

  const timer = setTimeout(() => {
    append(`\nStopped after ${RUN_TIMEOUT / 60_000} minutes.\n`);
    run.stopped = true;
    kill(child);
  }, RUN_TIMEOUT);
  let finished = false;
  const finish = (exitCode: number | null) => {
    if (finished) return;
    finished = true;
    clearTimeout(timer);
    const last: LastRun = {
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode,
      stopped: run.stopped,
      log: run.log.slice(-SAVED_LOG),
    };
    try {
      writeFileSync(lastFile(suite), JSON.stringify(last));
    } catch (e) {
      console.error(e);
    }
    if (state.pigxelTestRun === run) delete state.pigxelTestRun;
  };
  child.on("error", (e) => {
    append(`\n${e.message}\n`);
    finish(null);
  });
  child.on("close", (code) => finish(code));
  return { suite, startedAt };
}

export function stopRun() {
  const run = state.pigxelTestRun;
  if (!run) throw new ReviewError("Nothing is running.", 409);
  run.stopped = true;
  kill(run.child);
}

// Coverage runs write their whole coverage map into the json report, so each
// file is parsed once per change, not on every poll.
const parsed = new Map<string, { mtimeMs: number; value: unknown }>();

function cached<T>(file: string, parse: (json: unknown, at: Date) => T) {
  let mtimeMs: number;
  let at: Date;
  try {
    ({ mtimeMs, mtime: at } = statSync(file));
  } catch {
    return null;
  }
  const hit = parsed.get(file);
  if (hit?.mtimeMs === mtimeMs) return hit.value as T;
  let value: T | null;
  try {
    value = parse(JSON.parse(readFileSync(file, "utf8")), at);
  } catch {
    // Still being written, or not JSON: try again on the next poll.
    return null;
  }
  parsed.set(file, { mtimeMs, value });
  return value;
}

function lastRun(json: unknown): LastRun | null {
  if (typeof json !== "object" || json === null) return null;
  const last = json as Partial<LastRun>;
  return typeof last.startedAt === "string" &&
    typeof last.finishedAt === "string" &&
    (typeof last.exitCode === "number" || last.exitCode === null) &&
    typeof last.stopped === "boolean" &&
    typeof last.log === "string"
    ? (last as LastRun)
    : null;
}

export function testsSnapshot(): TestsSnapshot {
  const root = appDir();
  const run = state.pigxelTestRun;
  const result = (suite: SuiteId): SuiteResult => ({
    last: cached(lastFile(suite), lastRun),
    report: cached(reportFile(suite), (json) =>
      suite === "e2e" ? fromPlaywright(json) : fromVitest(json, root),
    ),
    coverage:
      suite === "coverage"
        ? cached(coverageFile(), (json, at) =>
            fromCoverage(json, root, at.toISOString(), COVERAGE_THRESHOLDS),
          )
        : null,
  });
  return {
    run: run
      ? { suite: run.suite, startedAt: run.startedAt, log: run.log }
      : null,
    suites: Object.fromEntries(
      SUITE_IDS.map((suite) => [suite, result(suite)]),
    ) as TestsSnapshot["suites"],
  };
}
