import type { BLEND_MODES, LAYER_KINDS } from "./constants";

export type BlendMode = (typeof BLEND_MODES)[number]["id"];

export type LayerKind = (typeof LAYER_KINDS)[number];

type LayerBase = {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: BlendMode;
  labelColor?: string;
};

export type PixelLayer = LayerBase & {
  kind: Exclude<LayerKind, "group">;
};

export type GroupLayer = LayerBase & {
  kind: "group";
  collapsed: boolean;
  children: Layer[];
};

export type Layer = PixelLayer | GroupLayer;

export type Place = { parentId: string | null; index: number };

export type PixelsOf = (id: string) => Uint8ClampedArray | undefined;
