import type { ReviewStatus } from "./types";

export const REVIEW_COOKIE = "pigxel-asset-review";
export const REVIEW_API = "/api/internal/assets";
export const REVIEW_STATUSES: ReviewStatus[] = ["approved", "fix", "pending"];
export const MAX_NOTE = 2000;
export const MAX_BLOCK_NAME = 40;
export const POLL_MS = 2000;
