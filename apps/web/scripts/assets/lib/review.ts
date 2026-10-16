import { existsSync } from "node:fs";
import { join } from "node:path";
import { ASSETS_DIR } from "./paths.ts";
import type { AssetSource } from "./source.ts";
import { readAssetText, writeAssetText } from "./file-io.ts";

/**
 * What a person decided about each asset, keyed by `<pack>/<id>`. A decision
 * holds for the drawing it was made on: once the file changes, the asset
 * needs reviewing again. Rejection notes are the feedback to redraw from.
 */
export const REVIEW_FILE = join(ASSETS_DIR, "review.json");

export type ReviewStatus = "approved" | "fix" | "pending";

export type ReviewEntry = {
  status: ReviewStatus;
  note: string;
  hash: string;
  at: string;
};

export type Reviews = Record<string, ReviewEntry>;

/** "changed" means it was reviewed, then redrawn. */
export type ReviewState = ReviewStatus | "changed";

export function readReviews(file = REVIEW_FILE): Reviews {
  if (!existsSync(file)) return {};
  return JSON.parse(readAssetText(file)) as Reviews;
}

export function writeReviews(reviews: Reviews, file = REVIEW_FILE) {
  const sorted = Object.fromEntries(
    Object.entries(reviews).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeAssetText(file, JSON.stringify(sorted, null, 2) + "\n");
}

export function reviewState(
  asset: Pick<AssetSource, "hash">,
  entry: ReviewEntry | undefined,
): ReviewState {
  if (!entry || entry.status === "pending") return "pending";
  return entry.hash === asset.hash ? entry.status : "changed";
}
