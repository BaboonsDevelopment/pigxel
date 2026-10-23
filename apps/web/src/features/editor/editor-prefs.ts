/**
 * How the editor is arranged. The layout itself is fixed: tools on the
 * left, the canvas with layers and timeline below it, and a sidebar on the
 * right. People choose only which tools show, whether the sidebar and the
 * timeline are open, which sidebar tab shows, the sidebar's width and the
 * timeline's height.
 */
export const SIDEBAR_TABS = ["palette", "tileset", "assistant"] as const;
export type SidebarTab = (typeof SIDEBAR_TABS)[number];

export const SIDEBAR_LABELS: Record<SidebarTab, string> = {
  palette: "Palette",
  tileset: "Tileset",
  assistant: "AI Assistant",
};

export const TIMELINE_HEIGHT = { initial: 224, min: 96, max: 640 };
/** The sidebar can't get narrower than the AI chat stays usable at. */
export const SIDEBAR_WIDTH = { initial: 288, min: 288, max: 640 };

export type EditorPrefs = {
  hiddenTools: string[];
  /** The tool last used in each tool group, shown on its button. */
  groupTools: Record<string, string>;
  sidebar: boolean;
  tab: SidebarTab;
  sidebarWidth: number;
  timeline: boolean;
  timelineHeight: number;
};

export const DEFAULT_PREFS: EditorPrefs = {
  hiddenTools: [],
  groupTools: {},
  sidebar: true,
  tab: "palette",
  sidebarWidth: SIDEBAR_WIDTH.initial,
  timeline: false,
  timelineHeight: TIMELINE_HEIGHT.initial,
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];

/**
 * Reads saved prefs, including layouts saved by the old movable panels:
 * those keep their tool choices and nothing else.
 */
export function readPrefs(raw: unknown): EditorPrefs {
  if (typeof raw !== "object" || raw === null) return DEFAULT_PREFS;
  const v = raw as Record<string, unknown>;
  const groupTools: Record<string, string> = {};
  for (const [group, tool] of Object.entries(
    (v.groupTools ?? {}) as Record<string, unknown>,
  ))
    if (typeof tool === "string") groupTools[group] = tool;
  const height = Number(v.timelineHeight);
  const width = Number(v.sidebarWidth);
  return {
    hiddenTools: [...new Set(strings(v.hiddenTools))],
    groupTools,
    sidebar: typeof v.sidebar === "boolean" ? v.sidebar : DEFAULT_PREFS.sidebar,
    tab: SIDEBAR_TABS.includes(v.tab as SidebarTab)
      ? (v.tab as SidebarTab)
      : DEFAULT_PREFS.tab,
    sidebarWidth: Number.isFinite(width)
      ? Math.min(SIDEBAR_WIDTH.max, Math.max(SIDEBAR_WIDTH.min, width))
      : DEFAULT_PREFS.sidebarWidth,
    timeline:
      typeof v.timeline === "boolean" ? v.timeline : DEFAULT_PREFS.timeline,
    timelineHeight: Number.isFinite(height)
      ? Math.min(TIMELINE_HEIGHT.max, Math.max(TIMELINE_HEIGHT.min, height))
      : DEFAULT_PREFS.timelineHeight,
  };
}

export function setToolShown(prefs: EditorPrefs, tool: string, shown: boolean) {
  const hidden = prefs.hiddenTools.filter((id) => id !== tool);
  return { ...prefs, hiddenTools: shown ? hidden : [...hidden, tool] };
}

/** Opens what a new tile started from Home needs (START_PANELS). */
export function openedFor(
  prefs: EditorPrefs,
  start?: "assistant" | "timeline" | "tileset",
): EditorPrefs {
  if (start === "timeline") return { ...prefs, timeline: true };
  if (start) return { ...prefs, sidebar: true, tab: start };
  return prefs;
}
