import type { PackDef, PaletteDef } from "../lib/asset.ts";
import { PALETTE_PRESETS } from "../../../src/lib/palette/presets.ts";

function preset(id: string, tags: string[]): PaletteDef {
  const found = PALETTE_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`No palette preset ${id}`);
  return {
    id,
    name: found.name,
    author: found.author,
    colors: found.colors,
    tags,
    preset: id,
  };
}

export const FREE_PALETTES: PackDef = {
  id: "free-palettes",
  name: "Free palettes",
  tier: "free",
  description: "Three classic community palettes, credited to their authors.",
  assets: [],
  palettes: [
    preset("pico-8", ["palette", "retro"]),
    preset("sweetie-16", ["palette"]),
    preset("endesga-32", ["palette"]),
  ],
};
