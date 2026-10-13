import type { Sprite } from "./sprite.ts";

export type Tier = "free" | "paid";

/** The category the current `assets` table needs until packs and tags exist. */
export type LegacyCategory = "characters" | "items" | "nature" | "tiles";

/** A named run of frames: an animation, or a set of variants of one thing. */
export type Clip = {
  name: string;
  kind: "animation" | "variant";
  frames: Sprite[];
  ms?: number;
  direction?: "forward" | "pingpong";
};

export type SliceDef = {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 9-slice border width in pixels. */
  border?: number;
};

export type AssetDef = {
  id: string;
  name: string;
  category: LegacyCategory;
  tags: string[];
  clips: Clip[];
  slices?: SliceDef[];
  notes?: string;
};

export type PaletteDef = {
  id: string;
  name: string;
  author?: string;
  colors: string[];
  tags: string[];
  /** Id of the palette preset that already ships in the editor. */
  preset?: string;
};

export type PackDef = {
  id: string;
  name: string;
  tier: Tier;
  description: string;
  assets: AssetDef[];
  palettes?: PaletteDef[];
};

export const still = (name: string, frame: Sprite): Clip => ({
  name,
  kind: "variant",
  frames: [frame],
});

export const variants = (names: string[], frames: Sprite[]): Clip[] =>
  frames.map((frame, i) => still(names[i]!, frame));

export const anim = (
  name: string,
  frames: Sprite[],
  ms = 120,
  direction: Clip["direction"] = "forward",
): Clip => ({ name, kind: "animation", frames, ms, direction });
