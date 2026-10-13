/**
 * Checks every drawn asset and prints its problems and review state, with
 * reviewers' notes on what to redraw. Exits with 1 when any asset has errors.
 *
 *   node scripts/assets/check.ts [--pack id] [--only asset-id] [--errors]
 */
import { relative } from "node:path";
import { parseArgs } from "node:util";
import { hasErrors, issuesOf } from "./lib/checks.ts";
import { readReviews, reviewState } from "./lib/review.ts";
import { loadPacks } from "./lib/source.ts";

const { values } = parseArgs({
  options: {
    pack: { type: "string", multiple: true },
    only: { type: "string", multiple: true },
    errors: { type: "boolean", default: false },
  },
});

const reviews = readReviews();
const packs = loadPacks().filter(
  (pack) => !values.pack?.length || values.pack.includes(pack.id),
);
const totals = { assets: 0, errors: 0, warnings: 0 };
const states: Record<string, number> = {};

for (const pack of packs) {
  for (const issue of pack.issues) {
    totals.errors++;
    console.log(`✗ ${pack.id}/pack.json  ${issue.message}`);
  }
  for (const asset of pack.assets) {
    if (values.only?.length && !values.only.includes(asset.id)) continue;
    totals.assets++;
    const issues = issuesOf(asset, pack).filter(
      (issue) => !values.errors || issue.level === "error",
    );
    const entry = reviews[asset.key];
    const state = reviewState(asset, entry);
    states[state] = (states[state] ?? 0) + 1;
    const failed = hasErrors(issues);
    if (failed) totals.errors++;
    totals.warnings += issues.filter((i) => i.level === "warning").length;
    if (values.errors && !failed) continue;

    console.log(
      `${failed ? "✗" : issues.length ? "!" : "✓"} ${asset.key}  [${state}]  ${relative(process.cwd(), asset.file)}`,
    );
    for (const issue of issues)
      console.log(
        `    ${issue.level === "error" ? "error" : "warn "} ${issue.rule}: ${issue.message}`,
      );
    if (entry?.note && state !== "approved")
      console.log(`    review: ${entry.note}`);
  }
}

console.log(
  `\n${totals.assets} assets: ${totals.errors} with errors, ${totals.warnings} warnings · ${Object.entries(
    states,
  )
    .map(([state, n]) => `${n} ${state}`)
    .join(", ")}`,
);
if (totals.errors) process.exitCode = 1;
