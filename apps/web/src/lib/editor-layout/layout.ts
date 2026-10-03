/**
 * How the editor's panels are laid out, kept per person in this browser, as
 * in Visual Studio: docks along the window's left and right edges, under
 * the canvas, and beside the canvas only (above the bottom dock, so it
 * keeps its width), each a row of stacks side by side, each stack panels one above the
 * other. Panels are moved between stacks and docks, folded, closed and
 * sized; the layout also keeps which tools the tool panel shows and the
 * tool each tool group last showed.
 */

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

/** Whether a dock's stacks have their sizer on the right (it sits on the left of what it borders). */
export const onLeft = (side: DockSide) =>
  side === "left" || side === "innerLeft";

export const PANEL_LABELS: Record<PanelId, string> = {
  tools: "Tools",
  colors: "Colors",
  palette: "Palette",
  assistant: "Assistant",
  timeline: "Timeline",
};

/** Sizes in screen pixels. A side stack's width; the bottom dock's height. */
export const STACK_WIDTH = { initial: 240, min: 64, max: 640 };
export const BOTTOM_HEIGHT = { initial: 224, min: 96, max: 640 };
/** The least a panel's body gets when stacks are resized. */
export const MIN_PANEL = 56;

/**
 * Panels one above another. `weights` share the stack's height between its
 * panels (folded ones take only their title bar). `size` is its width in
 * pixels in a side dock, and its share of the width in the bottom dock.
 */
type Stack = { panels: PanelId[]; weights: number[]; size: number };

export type Dock = {
  stacks: Stack[];
  /** The bottom dock's height in pixels; unused for the sides. */
  size: number;
};

export type Layout = {
  docks: Record<DockSide, Dock>;
  /** Folded to their title bar. */
  collapsed: PanelId[];
  /** Closed; Window brings them back. */
  hidden: PanelId[];
  /** Tools left off the tool panel; their shortcuts and menus still work. */
  hiddenTools: string[];
  /** The tool each group's button shows, by group id. */
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

/** Where each panel goes when a stored layout has lost it. */
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

/**
 * A layout from storage, made safe: unknown panels and empty stacks are
 * dropped, a panel listed twice keeps its first place, sizes are kept in
 * range, and a panel missing everywhere goes back to its home dock, so a
 * newer or broken layout never loses one.
 */
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

/** Where a dragged panel lands, next to another panel or at a dock's edge. */
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

/** `layout` without `id` anywhere; a stack left empty goes. */
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

/** A new stack of just `id` at the start or end of a dock. */
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

/**
 * Moves `id` to `target`: above or below another panel (into its stack, with
 * an even share of the height), left or right of it (a new stack beside its
 * stack), or a new stack at a dock's edge. A closed panel is shown again.
 */
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
    // Beside it: a side stack starts at the usual width; a bottom one
    // shares the width with its neighbour.
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

/** Shows or closes a panel. */
export function setPanelShown(layout: Layout, id: PanelId, shown: boolean) {
  return { ...layout, hidden: toggled(layout.hidden, id, !shown) };
}

/** Folds a panel to its title bar, or opens it again. */
export function setPanelCollapsed(
  layout: Layout,
  id: PanelId,
  collapsed: boolean,
) {
  return { ...layout, collapsed: toggled(layout.collapsed, id, collapsed) };
}

/** Shows or leaves out a tool on the tool panel. */
export function setToolShown(layout: Layout, tool: string, shown: boolean) {
  return { ...layout, hiddenTools: toggled(layout.hiddenTools, tool, !shown) };
}

/** Changes one stack: its weights, its size. */
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

/** The bottom dock's height. */
export function setBottomHeight(layout: Layout, height: number): Layout {
  return withDock(layout, "bottom", {
    ...layout.docks.bottom,
    size: clamp(height, BOTTOM_HEIGHT.min, BOTTOM_HEIGHT.max),
  });
}

/**
 * The stacks a dock shows, with their place in the dock (`index`), each with
 * only its open panels, their weight and place in the stack; empty ones
 * are left out.
 */
export function shownStacks(layout: Layout, side: DockSide) {
  return layout.docks[side].stacks.flatMap((s, index) => {
    const items = s.panels.flatMap((id, at) =>
      layout.hidden.includes(id) ? [] : [{ id, weight: s.weights[at]!, at }],
    );
    return items.length ? [{ index, size: s.size, items }] : [];
  });
}
