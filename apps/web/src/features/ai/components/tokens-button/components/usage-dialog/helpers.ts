import type { UsageRow } from "@/lib/ai/actions";

export type UsageAction = { kind: string; at: string; credits: number };

const GAP_MS = 10 * 60_000;

function kindOf(rows: UsageRow[]): string {
  const steps = new Set(rows.map((r) => r.step));
  if (steps.has("animate")) return "Animation";
  if (steps.has("plan") || steps.has("edit")) return "Edit";
  if (steps.has("generate")) return "Picture";
  return "Chat";
}

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

export const tokens = (credits: number) =>
  Math.round(credits).toLocaleString("en-US").replace(/,/g, " ");
