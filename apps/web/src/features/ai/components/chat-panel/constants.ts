import type { Area, Size } from "@/components/pixel-canvas/constants";
import type { AnimationSpec } from "@/components/pixel-canvas/use-sprite";
import type { ChatMessage } from "@/lib/ai/types";

export const SUGGESTIONS = [
  "make the eyes red",
  "draw a small green slime",
  "a monkey that throws a grenade",
];

export type LayerInfo = {
  id: string;
  name: string;
  editable: boolean;
  box: Area | null;
};

export type TileObject = { area: Area; layerId: string };

export type CanvasBridge = {
  size: () => Size;
  isEmpty: () => boolean;
  freeArea: () => Area | null;
  snapshot: (area?: Area, background?: string) => string;
  overlapsDrawing: (area: Area) => boolean;
  layers: () => LayerInfo[];
  objects: () => TileObject[];
  activeLayer: () => string;
  frameId: () => string;
  framesOf: (layerId: string) => string[];
  readCel: (layerId: string, frameId: string) => Uint8ClampedArray;
  writeCels: (
    layerId: string,
    cels: Map<string, Uint8ClampedArray | null>,
  ) => void;
  snapshotCel: (
    layerId: string,
    frameId: string,
    area: Area,
    background: string | null,
  ) => string;
  addLayer: (
    name: string,
    pixels: Uint8ClampedArray,
    replace: boolean,
  ) => string;
  addLayers: (
    layers: { name: string; pixels: Uint8ClampedArray }[],
  ) => string[];
  cutToLayer: (layerId: string, area: Area, name: string) => string;
  addAnimation: (spec: AnimationSpec) => void;
  play: () => void;
  undo: () => boolean;
  selectArea: () => Promise<Area | null>;
  adjustArea: (area: Area) => Promise<Area | null>;
  highlight: (area: Area | null) => void;
};

export type Placement = {
  kind: "replace" | "free" | "compose";
  label: string;
  area: Area;
};

export type ChatEntry = ChatMessage & {
  image?: string;
  references?: string[];
  picture?: string;
  placements?: Placement[];
  button?: { label: string; run: () => Promise<boolean> };
};

export type Chat = {
  canvas: CanvasBridge;
  messages: ChatEntry[];
  selectArea: boolean;
  references: string[];
  append: (entry: ChatEntry) => void;
  say: (content: string) => void;
  setPending: (pending: boolean) => void;
  setError: (error: string | null) => void;
};

export const UNREACHABLE = {
  ok: false,
  error: "Could not reach the server.",
} as const;

export const ASK_SELECT =
  "Select the area on the tile you want to work on (Esc to cancel).";
export const ASK_FRAME =
  'Move or resize the highlighted frame on the tile if needed, then press "Generate here".';
export const NO_LAYER =
  "That layer is hidden or locked. Show and unlock it in the timeline, then ask again.";

export const MAX_OVERLAP = 0.03;

export const REFERENCE_SIDE = 512;
export const REFERENCE_QUALITY = 0.9;

export const FRAMES_SHEET_SIDE = 1024;

export const REVIEW_MARGIN = 4;
