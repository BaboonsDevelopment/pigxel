export const PANELS = [
  "tools",
  "colors",
  "palette",
  "assistant",
  "timeline",
] as const;
export type PanelId = (typeof PANELS)[number];
export type DockSide = "left" | "right" | "bottom" | "innerLeft" | "innerRight";
const DOCKS: DockSide[] = [
  "left",
  "right",
  "bottom",
  "innerLeft",
  "innerRight",
];

export const onLeft = (side: DockSide) =>
  side === "left" || side === "innerLeft";

export const PANEL_LABELS: Record<PanelId, string> = {
  tools: "Tools",
  colors: "Colors",
  palette: "Palette",
  assistant: "Assistant",
  timeline: "Timeline",
};

export const STACK_WIDTH = { initial: 240, min: 64, max: 640 };
export const BOTTOM_HEIGHT = { initial: 224, min: 96, max: 640 };
export const MIN_PANEL = 56;

type Stack = { panels: PanelId[]; weights: number[]; size: number };

export type Dock = {
  stacks: Stack[];
  size: number;
};

export type Layout = {
  docks: Record<DockSide, Dock>;
  collapsed: PanelId[];
  hidden: PanelId[];
  hiddenTools: string[];
  groupTools: Record<string, string>;
};

const stack = (panels: PanelId[], weights: number[], size: number): Stack => ({
  panels,
  weights,
  size,
});

export const DEFAULT_LAYOUT: Layout = {
  docks: {
    left: { stacks: [stack(["tools", "colors"], [3, 2], 112)], size: 0 },
    right: { stacks: [stack(["palette", "assistant"], [1, 2], 320)], size: 0 },
    bottom: {
      stacks: [stack(["timeline"], [1], 1)],
      size: BOTTOM_HEIGHT.initial,
    },
    innerLeft: { stacks: [], size: 0 },
    innerRight: { stacks: [], size: 0 },
  },
  collapsed: [],
  hidden: [],
  hiddenTools: [],
  groupTools: {},
};

const HOME: Record<PanelId, DockSide> = {
  tools: "left",
  colors: "left",
  palette: "right",
  assistant: "right",
  timeline: "bottom",
};

const isPanel = (v: unknown): v is PanelId => PANELS.includes(v as PanelId);
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
const num = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 ? v : fallback;
const stringList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
const panelList = (v: unknown): PanelId[] =>
  Array.isArray(v) ? [...new Set(v.filter(isPanel))] : [];

export function readLayout(raw: unknown): Layout {
  if (typeof raw !== "object" || raw === null) return DEFAULT_LAYOUT;
  const v = raw as Record<string, unknown>;
  const docksRaw = (v.docks ?? {}) as Record<string, unknown>;
  const seen = new Set<PanelId>();
  const docks = {} as Record<DockSide, Dock>;
  for (const side of DOCKS) {
    const d = (docksRaw[side] ?? {}) as Record<string, unknown>;
    const stacks: Stack[] = [];
    for (const s of Array.isArray(d.stacks) ? d.stacks : []) {
      const r = (s ?? {}) as Record<string, unknown>;
      const weights = Array.isArray(r.weights) ? r.weights : [];
      const panels: PanelId[] = [];
      const kept: number[] = [];
      (Array.isArray(r.panels) ? r.panels : []).forEach((p, i) => {
        if (!isPanel(p) || seen.has(p)) return;
        seen.add(p);
        panels.push(p);
        kept.push(num(weights[i], 1));
      });
      if (panels.length)
        stacks.push({
          panels,
          weights: kept,
          size:
            side === "bottom"
              ? num(r.size, 1)
              : clamp(
                  num(r.size, STACK_WIDTH.initial),
                  STACK_WIDTH.min,
                  STACK_WIDTH.max,
                ),
        });
    }
    docks[side] = {
      stacks,
      size:
        side === "bottom"
          ? clamp(
              num(d.size, BOTTOM_HEIGHT.initial),
              BOTTOM_HEIGHT.min,
              BOTTOM_HEIGHT.max,
            )
          : 0,
    };
  }
  let layout: Layout = {
    docks,
    collapsed: panelList(v.collapsed),
    hidden: panelList(v.hidden),
    hiddenTools: stringList(v.hiddenTools),
    groupTools:
      typeof v.groupTools === "object" && v.groupTools !== null
        ? Object.fromEntries(
            Object.entries(v.groupTools).filter(
              (e): e is [string, string] => typeof e[1] === "string",
            ),
          )
        : {},
  };
  for (const p of PANELS)
    if (!seen.has(p)) layout = placeAtEdge(layout, p, HOME[p], "end");
  return layout;
}

export type PanelTarget =
  | {
      kind: "panel";
      anchor: PanelId;
      where: "above" | "below" | "left" | "right";
    }
  | { kind: "dock"; dock: DockSide; where: "start" | "end" };

const dockOf = (layout: Layout, id: PanelId): DockSide | null =>
  DOCKS.find((d) =>
    layout.docks[d].stacks.some((s) => s.panels.includes(id)),
  ) ?? null;

const withDock = (layout: Layout, side: DockSide, dock: Dock): Layout => ({
  ...layout,
  docks: { ...layout.docks, [side]: dock },
});

function withoutPanel(layout: Layout, id: PanelId): Layout {
  let out = layout;
  for (const side of DOCKS) {
    const dock = out.docks[side];
    if (!dock.stacks.some((s) => s.panels.includes(id))) continue;
    const stacks = dock.stacks.flatMap((s) => {
      const at = s.panels.indexOf(id);
      if (at < 0) return [s];
      const panels = s.panels.filter((p) => p !== id);
      return panels.length
        ? [{ ...s, panels, weights: s.weights.filter((_, i) => i !== at) }]
        : [];
    });
    out = withDock(out, side, { ...dock, stacks });
  }
  return out;
}

function placeAtEdge(
  layout: Layout,
  id: PanelId,
  side: DockSide,
  where: "start" | "end",
): Layout {
  const dock = layout.docks[side];
  const fresh = stack([id], [1], side === "bottom" ? 1 : STACK_WIDTH.initial);
  const stacks =
    where === "start" ? [fresh, ...dock.stacks] : [...dock.stacks, fresh];
  return withDock(layout, side, { ...dock, stacks });
}

export function movePanel(
  layout: Layout,
  id: PanelId,
  target: PanelTarget,
): Layout {
  if (target.kind === "panel" && target.anchor === id) return layout;
  let out = withoutPanel(layout, id);
  out = { ...out, hidden: out.hidden.filter((p) => p !== id) };
  if (target.kind === "dock")
    return placeAtEdge(out, id, target.dock, target.where);
  const side = dockOf(out, target.anchor);
  if (!side) return placeAtEdge(out, id, HOME[id], "end");
  const dock = out.docks[side];
  const index = dock.stacks.findIndex((s) => s.panels.includes(target.anchor));
  const host = dock.stacks[index]!;
  const stacks = [...dock.stacks];
  if (target.where === "above" || target.where === "below") {
    const at =
      host.panels.indexOf(target.anchor) + (target.where === "below" ? 1 : 0);
    const share = host.weights.reduce((a, b) => a + b, 0) / host.panels.length;
    const panels = [...host.panels];
    const weights = [...host.weights];
    panels.splice(at, 0, id);
    weights.splice(at, 0, share);
    stacks[index] = { ...host, panels, weights };
  } else {
    const size = side === "bottom" ? host.size / 2 : STACK_WIDTH.initial;
    if (side === "bottom") stacks[index] = { ...host, size: host.size / 2 };
    stacks.splice(
      index + (target.where === "right" ? 1 : 0),
      0,
      stack([id], [1], size),
    );
  }
  return withDock(out, side, { ...dock, stacks });
}

const without = <T>(list: T[], item: T) => list.filter((x) => x !== item);
const toggled = <T>(list: T[], item: T, on: boolean) =>
  on ? (list.includes(item) ? list : [...list, item]) : without(list, item);

export function setPanelShown(layout: Layout, id: PanelId, shown: boolean) {
  return { ...layout, hidden: toggled(layout.hidden, id, !shown) };
}

export function setPanelCollapsed(
  layout: Layout,
  id: PanelId,
  collapsed: boolean,
) {
  return { ...layout, collapsed: toggled(layout.collapsed, id, collapsed) };
}

export function setToolShown(layout: Layout, tool: string, shown: boolean) {
  return { ...layout, hiddenTools: toggled(layout.hiddenTools, tool, !shown) };
}

export function updateStack(
  layout: Layout,
  side: DockSide,
  index: number,
  patch: Partial<Stack>,
): Layout {
  const dock = layout.docks[side];
  const stacks = dock.stacks.map((s, i) =>
    i === index
      ? {
          ...s,
          ...patch,
          size:
            side === "bottom"
              ? (patch.size ?? s.size)
              : clamp(patch.size ?? s.size, STACK_WIDTH.min, STACK_WIDTH.max),
        }
      : s,
  );
  return withDock(layout, side, { ...dock, stacks });
}

export function setBottomHeight(layout: Layout, height: number): Layout {
  return withDock(layout, "bottom", {
    ...layout.docks.bottom,
    size: clamp(height, BOTTOM_HEIGHT.min, BOTTOM_HEIGHT.max),
  });
}

export function shownStacks(layout: Layout, side: DockSide) {
  return layout.docks[side].stacks.flatMap((s, index) => {
    const items = s.panels.flatMap((id, at) =>
      layout.hidden.includes(id) ? [] : [{ id, weight: s.weights[at]!, at }],
    );
    return items.length ? [{ index, size: s.size, items }] : [];
  });
}
