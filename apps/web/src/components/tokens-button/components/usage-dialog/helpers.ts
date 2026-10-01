import type { UsageRow } from "@/lib/ai/actions";

/** One thing the person asked for, and the tokens it took. */
export type UsageAction = { kind: string; at: string; credits: number };

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
    credits: group.reduce((sum, r) => sum + r.credits, 0),
  }));
}

/** "4 913": whole tokens, grouped by thousands. */
export const tokens = (credits: number) =>
  Math.round(credits).toLocaleString("en-US").replace(/,/g, " ");
