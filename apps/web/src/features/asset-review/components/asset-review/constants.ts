export type View = "review" | "production" | "reports";

export type Filter = "todo" | "fix" | "approved" | "blocked" | "all";

export const REVIEW_PATH = "/internal/assets";

export const VIEWS: { id: View; label: string }[] = [
  { id: "review", label: "Review" },
  { id: "production", label: "In production" },
  { id: "reports", label: "Reports" },
];

export const FILTERS: { id: Filter; label: string }[] = [
  { id: "todo", label: "To review" },
  { id: "fix", label: "To fix" },
  { id: "approved", label: "Approved" },
  { id: "blocked", label: "Errors" },
  { id: "all", label: "All" },
];

export const BACKGROUNDS = [
  { id: "checker", label: "Checker", className: "bg-checker" },
  { id: "light", label: "Light", className: "bg-[#f4f1ea]" },
  { id: "dark", label: "Dark", className: "bg-[#1f2430]" },
  { id: "grass", label: "Grass", className: "bg-[#3e8948]" },
];

export const PILL =
  "flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border bg-background px-4 text-xs whitespace-nowrap transition-colors hover:bg-muted aria-pressed:border-transparent aria-pressed:bg-pastel-pink aria-[current=page]:border-transparent aria-[current=page]:bg-pastel-pink disabled:cursor-not-allowed disabled:opacity-50";

export const CARD =
  "group relative overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md";

export const GRID =
  "grid grid-cols-2 gap-x-[33px] gap-y-[28px] sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export const REVIEW_GRID =
  "grid grid-cols-1 gap-x-[33px] gap-y-[28px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export const CANVAS_SCALE = 8;
export const TILE_REPEAT = 3;
export const FRAME_STRIP_SCALE = 4;
export const DEFAULT_FRAME_MS = 120;

export const STATE_LABELS = {
  pending: "To review",
  changed: "Redrawn",
  approved: "Approved",
  fix: "To fix",
} as const;
