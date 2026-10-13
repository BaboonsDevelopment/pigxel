/**
 * Starts the app for the end-to-end tests, on local Supabase only:
 * `prod` builds and serves it like production, `dev` runs the dev server for
 * quick iteration. Playwright runs this; `pnpm test:e2e:serve` keeps one up
 * that test runs reuse.
 *
 * Next.js rewrites next-env.d.ts to point at the build folder it uses, so the
 * file is put back whenever Next writes it, keeping test runs out of git.
 */
import { spawn, spawnSync } from "node:child_process";
import { readFileSync, watch, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { E2E_PORT, serverEnv } from "./server.ts";

const mode = process.argv[2] ?? "prod";
if (mode !== "prod" && mode !== "dev")
  throw new Error("Usage: node e2e/support/serve.ts [prod|dev]");

const env = { ...process.env, ...serverEnv() };
const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const typesFile = new URL("../../next-env.d.ts", import.meta.url);
const original = readFileSync(typesFile, "utf8");
const restore = () => {
  if (readFileSync(typesFile, "utf8") !== original)
    writeFileSync(typesFile, original);
};

if (mode === "prod") {
  const build = spawnSync(process.execPath, [next, "build"], {
    env,
    stdio: "inherit",
  });
  restore();
  if (build.status !== 0) process.exit(build.status ?? 1);
}

const server = spawn(
  process.execPath,
  [next, mode === "prod" ? "start" : "dev", "--port", String(E2E_PORT)],
  { env, stdio: ["ignore", "pipe", "inherit"] },
);
server.stdout.pipe(process.stdout);
// The dev server rewrites the file whenever it regenerates route types.
watch(typesFile, restore);
server.on("exit", (code) => process.exit(code ?? 1));
