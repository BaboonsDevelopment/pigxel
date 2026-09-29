import type { BLEND_MODES, LAYER_KINDS } from "./constants";

export type BlendMode = (typeof BLEND_MODES)[number]["id"];

/**
 * - normal: a transparent sheet to draw on.
 * - background: the opaque bottom sheet; always first, the eraser paints its colour.
 * - group: a folder of layers, shown, hidden and faded together.
 * - reference: a picture to trace; shown in the editor, never drawn on or exported.
 */
export type LayerKind = (typeof LAYER_KINDS)[number];

type LayerBase = {
  id: string;
  name: string;
  visible: boolean;
  /** A locked layer can't be drawn on. */
  locked: boolean;
  /** 0 (invisible) to 255 (opaque). */
  opacity: number;
  blend: BlendMode;
};

/** A layer with its own pixels. */
export type PixelLayer = LayerBase & {
  kind: Exclude<LayerKind, "group">;
};

export type GroupLayer = LayerBase & {
  kind: "group";
  /** The panel hides the children of a collapsed group. */
  collapsed: boolean;
  /** Bottom to top. */
  children: Layer[];
};

export type Layer = PixelLayer | GroupLayer;

/** Where a layer goes: inside `parentId` (null for the top level), at `index` counted from the bottom. */
export type Place = { parentId: string | null; index: number };

/** The RGBA pixels (width × height × 4) of a pixel layer, by id. */
export type PixelsOf = (id: string) => Uint8ClampedArray | undefined;
