import type { UsageRow } from "@/lib/ai/actions";

/** One thing the person asked for, and the AI requests it took. */
export type UsageAction = {
  kind: string;
  at: string;
  /** Dollars; null when a request had no known price. */
  cost: number | null;
  rows: UsageRow[];
};

/** A longer pause than this starts a new action even without a new message. */
const GAP_MS = 10 * 60_000;

/** What the requests did, from the steps they took. */
function kindOf(rows: UsageRow[]): string {
  const steps = new Set(rows.map((r) => r.step));
  if (steps.has("animate")) return "Animation";
  if (steps.has("plan") || steps.has("edit")) return "Edit";
  if (steps.has("generate")) return "Picture";
  return "Chat";
}

/**
 * Requests (newest first) grouped into actions, newest first: each message
 * starts with routing it, and what follows until the next belongs to it.
 */
export function groupActions(rows: UsageRow[]): UsageAction[] {
  const groups: UsageRow[][] = [];
  let last = 0;
  for (const row of [...rows].reverse()) {
    const at = Date.parse(row.at);
    const current = groups.at(-1);
    if (!current || row.step === "route" || at - last > GAP_MS)
      groups.push([row]);
    else current.push(row);
    last = at;
  }
  return groups.reverse().map((group) => ({
    kind: kindOf(group),
    at: group[0]!.at,
    cost: group.some((r) => r.cost === null)
      ? null
      : group.reduce((sum, r) => sum + r.cost!, 0),
    rows: group,
  }));
}

/** "$0.0452", or "—" without a price. */
export const dollars = (cost: number | null) =>
  cost === null ? "—" : `$${cost.toFixed(4)}`;
