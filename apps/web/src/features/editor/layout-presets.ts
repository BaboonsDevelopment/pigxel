import { DEFAULT_LAYOUT, readLayout, type Layout } from "./layout";

export const LAYOUT_PRESETS = ["Drawing", "Animation", "Tiles"] as const;
export type LayoutPreset = (typeof LAYOUT_PRESETS)[number];
export type SavedPreset = { layout: Layout; updatedAt: number };
export type SavedPresets = Partial<Record<LayoutPreset, SavedPreset>>;

export function presetLayout(name: LayoutPreset): Layout {
  return readLayout({
    ...DEFAULT_LAYOUT,
    hidden:
      name === "Drawing"
        ? ["tileset", "timeline", "assistant"]
        : name === "Animation"
          ? ["tileset", "assistant"]
          : ["assistant", "timeline"],
    heights: name === "Tiles" ? { tileset: 360 } : {},
  });
}

export function readPresets(raw: unknown): SavedPresets {
  if (!raw || typeof raw !== "object") return {};
  const out: SavedPresets = {};
  for (const name of LAYOUT_PRESETS) {
    const value = (raw as Record<string, unknown>)[name];
    if (!value || typeof value !== "object") continue;
    const entry = value as Record<string, unknown>;
    if (
      !entry.layout ||
      typeof entry.layout !== "object" ||
      typeof entry.updatedAt !== "number" ||
      !Number.isFinite(entry.updatedAt) ||
      entry.updatedAt <= 0
    )
      continue;
    out[name] = {
      layout: readLayout(entry.layout),
      updatedAt: entry.updatedAt,
    };
  }
  return out;
}

export function mergePresets(
  local: SavedPresets,
  remote: SavedPresets,
): SavedPresets {
  const out = { ...local };
  for (const name of LAYOUT_PRESETS) {
    const entry = remote[name];
    if (entry && entry.updatedAt > (local[name]?.updatedAt ?? 0))
      out[name] = entry;
  }
  return out;
}
