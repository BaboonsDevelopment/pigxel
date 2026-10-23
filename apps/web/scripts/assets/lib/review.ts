import {
  closeSync,
  existsSync,
  openSync,
  renameSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ASSETS_DIR } from "./paths.ts";
import type { AssetSource } from "./source.ts";
import {
  readAssetText,
  retryFileOperation,
  writeAssetText,
} from "./file-io.ts";

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
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeAssetText(temporary, JSON.stringify(sorted, null, 2) + "\n");
    retryFileOperation(() => renameSync(temporary, file));
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

/** Keep simultaneous review decisions from overwriting one another. */
export function updateReviews(
  update: (reviews: Reviews) => void,
  file = REVIEW_FILE,
) {
  const lock = `${file}.lock`;
  let handle: number | undefined;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      handle = openSync(lock, "wx");
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lock).mtimeMs > 30_000) unlinkSync(lock);
      } catch (staleError) {
        if ((staleError as NodeJS.ErrnoException).code !== "ENOENT")
          throw staleError;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
  if (handle === undefined) throw new Error("Timed out waiting for review file.");
  try {
    const reviews = readReviews(file);
    update(reviews);
    writeReviews(reviews, file);
  } finally {
    closeSync(handle);
    unlinkSync(lock);
  }
}

export function reviewState(
  asset: Pick<AssetSource, "hash">,
  entry: ReviewEntry | undefined,
): ReviewState {
  if (!entry || entry.status === "pending") return "pending";
  return entry.hash === asset.hash ? entry.status : "changed";
}
