import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const proc = vi.hoisted(() => ({ spawn: vi.fn(), execFile: vi.fn() }));
vi.mock("node:child_process", async (original) => ({
  ...(await original<typeof import("node:child_process")>()),
  spawn: proc.spawn,
  execFile: proc.execFile,
}));

import { GET } from "@/app/api/internal/tests/route";
import { DELETE, POST } from "@/app/api/internal/tests/run/route";
import { REVIEW_COOKIE } from "@/features/asset-review/constants";
import {
  childEnv,
  commandFor,
  startRun,
  stopRun,
  testsSnapshot,
} from "@/features/test-runs/server";

class FakeChild extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  pid = 4242;
  exitCode: number | null = null;
  kill = vi.fn();
  /** Ends the run the way Node reports it. */
  exit(code: number) {
    this.exitCode = code;
    this.emit("close", code);
  }
}

const KEY = "open-sesame";
let dir: string;
let child: FakeChild;
const platform = Object.getOwnPropertyDescriptor(process, "platform")!;
const onPlatform = (value: string) =>
  Object.defineProperty(process, "platform", { ...platform, value });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "pigxel-test-runs-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  child = new FakeChild();
  proc.spawn.mockReturnValue(child);
});

afterEach(() => {
  // Never leave a run open for the next test.
  if (child.exitCode === null) child.exit(0);
  Object.defineProperty(process, "platform", platform);
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const report = (suite: string) => join(dir, ".test-runs", `${suite}.json`);
const last = (suite: string) => join(dir, ".test-runs", `${suite}.last.json`);

describe("starting a run", () => {
  it("runs the suite's command from the app folder", () => {
    startRun("db");
    const [node, args, options] = proc.spawn.mock.calls[0]!;
    expect(node).toBe(process.execPath);
    expect(args).toEqual(commandFor("db", dir));
    expect(options).toMatchObject({ cwd: dir, windowsHide: true });
  });

  it("asks each suite for a report the page can read", () => {
    expect(commandFor("unit", dir)).toEqual(
      expect.arrayContaining([
        "--project",
        "unit",
        "dom",
        "--reporter=json",
        `--outputFile.json=${report("unit")}`,
      ]),
    );
    expect(commandFor("coverage", dir)).toEqual(
      expect.arrayContaining(["--coverage", "--coverage.reportOnFailure"]),
    );
    expect(commandFor("e2e", dir)).toEqual([
      join(dir, "node_modules", "@playwright", "test", "cli.js"),
      "test",
      "--reporter=list,json,html",
    ]);
  });

  it("gives tests a terminal's environment, not the dev server's", () => {
    writeFileSync(join(dir, ".env.local"), "HOSTED_SECRET=abc\n# NOTE=1\n");
    vi.stubEnv("HOSTED_SECRET", "abc");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("__NEXT_PRIVATE_ORIGIN", "http://localhost:3000");
    vi.stubEnv("PATH_LIKE_KEEP", "yes");
    const env = childEnv("e2e", dir);
    expect(env.HOSTED_SECRET).toBeUndefined();
    expect(env.NODE_ENV).toBeUndefined();
    expect(env.__NEXT_PRIVATE_ORIGIN).toBeUndefined();
    expect(env.PATH_LIKE_KEEP).toBe("yes");
    expect(env).toMatchObject({
      FORCE_COLOR: "0",
      PLAYWRIGHT_HTML_OPEN: "never",
      PLAYWRIGHT_JSON_OUTPUT_NAME: report("e2e"),
    });
  });

  it("refuses unknown suites and a second run at once", () => {
    expect(() => startRun("everything")).toThrow("Unknown test suite.");
    startRun("unit");
    expect(() => startRun("db")).toThrow("Tests are already running.");
    expect(proc.spawn).toHaveBeenCalledTimes(1);
  });

  it("drops the last report so a crashed run can't show stale results", () => {
    mkdirSync(join(dir, ".test-runs"));
    writeFileSync(report("unit"), JSON.stringify({ testResults: [] }));
    startRun("unit");
    expect(existsSync(report("unit"))).toBe(false);
  });
});

describe("a running suite", () => {
  it("streams its output without colour codes", () => {
    startRun("unit");
    child.stdout.emit("data", Buffer.from("\u001b[32m✓\u001b[39m one\n"));
    child.stderr.emit("data", Buffer.from("warn\n"));
    expect(testsSnapshot().run).toMatchObject({
      suite: "unit",
      log: "✓ one\nwarn\n",
    });
  });

  it("saves how it ended and frees the runner", () => {
    startRun("unit");
    child.stdout.emit("data", Buffer.from("done\n"));
    child.exit(1);
    expect(JSON.parse(readFileSync(last("unit"), "utf8"))).toMatchObject({
      exitCode: 1,
      stopped: false,
      log: "done\n",
    });
    expect(testsSnapshot().run).toBeNull();
    child = new FakeChild();
    proc.spawn.mockReturnValue(child);
    expect(() => startRun("unit")).not.toThrow();
  });

  it("frees the runner when the process can't start", () => {
    startRun("unit");
    child.emit("error", new Error("spawn ENOENT"));
    child.emit("close", -2);
    const saved = JSON.parse(readFileSync(last("unit"), "utf8"));
    expect(saved).toMatchObject({ exitCode: null });
    expect(saved.log).toContain("spawn ENOENT");
    expect(testsSnapshot().run).toBeNull();
  });

  it("stops the whole process tree on Windows", () => {
    onPlatform("win32");
    startRun("e2e");
    stopRun();
    expect(proc.execFile).toHaveBeenCalledWith(
      "taskkill",
      ["/pid", "4242", "/T", "/F"],
      expect.any(Function),
    );
    child.exit(1);
    expect(JSON.parse(readFileSync(last("e2e"), "utf8")).stopped).toBe(true);
  });

  it("stops the whole process group elsewhere", () => {
    onPlatform("linux");
    const kill = vi.spyOn(process, "kill").mockReturnValue(true);
    startRun("e2e");
    expect(proc.spawn.mock.calls[0]![2]).toMatchObject({ detached: true });
    stopRun();
    expect(kill).toHaveBeenCalledWith(-4242, "SIGTERM");
  });

  it("has nothing to stop when idle", () => {
    expect(() => stopRun()).toThrow("Nothing is running.");
  });
});

describe("the snapshot", () => {
  it("reads each suite's saved report and coverage", () => {
    mkdirSync(join(dir, ".test-runs"));
    mkdirSync(join(dir, "coverage"));
    writeFileSync(
      report("unit"),
      JSON.stringify({
        startTime: 0,
        testResults: [
          {
            name: join(dir, "tests", "a.test.ts"),
            status: "passed",
            message: "",
            assertionResults: [
              {
                title: "works",
                ancestorTitles: [],
                status: "passed",
                failureMessages: [],
              },
            ],
          },
        ],
      }),
    );
    writeFileSync(report("e2e"), JSON.stringify({ suites: [], errors: [] }));
    const metric = { total: 10, covered: 5, skipped: 0, pct: 50 };
    writeFileSync(
      join(dir, "coverage", "coverage-summary.json"),
      JSON.stringify({
        total: {
          lines: metric,
          statements: metric,
          functions: metric,
          branches: metric,
        },
      }),
    );
    writeFileSync(last("db"), "{ half-written");

    const { suites } = testsSnapshot();
    expect(suites.unit.report?.files[0]?.file).toBe("tests/a.test.ts");
    expect(suites.e2e.report?.totals.passed).toBe(0);
    expect(suites.coverage.coverage?.totals.lines).toMatchObject({
      pct: 50,
      threshold: 31,
    });
    expect(suites.unit.coverage).toBeNull();
    expect(suites.db).toEqual({ last: null, report: null, coverage: null });
  });
});

describe("the tests API", () => {
  const request = (method: string, body?: unknown, key: string | null = KEY) =>
    new NextRequest("http://localhost/api/internal/tests/run", {
      method,
      headers: {
        ...(key ? { cookie: `${REVIEW_COOKIE}=${key}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const open = () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ASSETS_REVIEW_KEY", KEY);
  };

  it("doesn't exist outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ASSETS_REVIEW_KEY", KEY);
    expect((await GET(request("GET"))).status).toBe(404);
    expect((await POST(request("POST", { suite: "unit" }))).status).toBe(404);
    expect(proc.spawn).not.toHaveBeenCalled();
  });

  it("doesn't exist without a review key configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ASSETS_REVIEW_KEY", "");
    expect((await GET(request("GET", undefined, ""))).status).toBe(404);
  });

  it("asks for the review key", async () => {
    open();
    expect((await GET(request("GET", undefined, null))).status).toBe(401);
    expect((await GET(request("GET", undefined, "wrong"))).status).toBe(401);
    expect((await DELETE(request("DELETE", undefined, "wrong"))).status).toBe(
      401,
    );
    expect(
      (await POST(request("POST", { suite: "unit" }, "wrong"))).status,
    ).toBe(401);
    expect(proc.spawn).not.toHaveBeenCalled();
  });

  it("starts, reports and stops a run", async () => {
    open();
    onPlatform("win32");
    const started = await POST(request("POST", { suite: "unit" }));
    expect(started.status).toBe(200);
    expect(await started.json()).toMatchObject({ suite: "unit" });

    const busy = await POST(request("POST", { suite: "db" }));
    expect(busy.status).toBe(409);

    const snapshot = await (await GET(request("GET"))).json();
    expect(snapshot.run).toMatchObject({ suite: "unit" });

    expect((await DELETE(request("DELETE"))).status).toBe(200);
    child.exit(1);
    expect((await DELETE(request("DELETE"))).status).toBe(409);
  });

  it("rejects a bad request body", async () => {
    open();
    const bad = await POST(
      new NextRequest("http://localhost/api/internal/tests/run", {
        method: "POST",
        headers: { cookie: `${REVIEW_COOKIE}=${KEY}` },
        body: "not json",
      }),
    );
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ error: "Unknown test suite." });
  });
});
