import type { Area } from "@/components/pixel-canvas/constants";
import type { EncodedTile } from "@/lib/edit/codec";
import type { ChatMessage } from "@/lib/ai/types";

export const SUGGESTIONS = [
  "make the eyes red",
  "draw a small green slime",
  "add a one-pixel outline",
];

/** What the chat needs from the canvas; the tile editor provides it. */
export type CanvasBridge = {
  isEmpty: () => boolean;
  fullArea: () => Area;
  freeArea: () => Area | null;
  /** Whether the selected layer can be drawn on (shown, unlocked, not a group). */
  canPaint: () => boolean;
  /** The tile (or `area`) as an enlarged PNG data URL, every layer combined. */
  snapshot: (area?: Area, background?: string) => string;
  /** `area` of the selected layer alone, as an enlarged PNG data URL. */
  snapshotLayer: (area: Area, background: string) => string;
  selectArea: () => Promise<Area | null>;
  /** Lets the user move and resize a proposed area; null when they cancel. */
  adjustArea: (area: Area) => Promise<Area | null>;
  highlight: (area: Area | null) => void;
  /** Turns a generated picture into pixel art and puts it into `area`. */
  place: (image: string, area: Area, replace: boolean) => Promise<void>;
  /** The drawn part of `area` with a small margin; `area` when it is empty. */
  paintedArea: (area: Area) => Area;
  /** `area` as the text grid a precise edit is made on. */
  encode: (area: Area) => EncodedTile;
  /**
   * Runs a precise edit's operations inside `area`; returns how many worked.
   * The objects boxed in `keep` are left exactly as they are.
   */
  applyEdit: (
    ops: string[],
    palette: Record<string, string>,
    area: Area,
    keep: Area[],
  ) => number;
  /**
   * Puts a redrawn picture of `area` back, changing only what differs and
   * leaving the objects boxed in `keep` exactly as they are.
   */
  applyRedraw: (image: string, area: Area, keep: Area[]) => Promise<void>;
  /** Boxes of the separate drawn things on the tile, biggest first. */
  objects: () => Area[];
  /**
   * Puts a redrawn object into `target` after erasing it from `source`, for
   * edits that move or resize it; other drawings are left alone.
   */
  replaceObject: (image: string, source: Area, target: Area) => Promise<void>;
  /** Moves the drawn things inside `source` to `target`, pixel for pixel. */
  moveObject: (source: Area, target: Area) => void;
  /** True when noticeably much of `area` is already drawn on. */
  overlapsDrawing: (area: Area) => boolean;
  /** Copies the drawn things inside `source` into each of `targets`. */
  copyObject: (source: Area, targets: Area[]) => void;
  /** Puts one generated picture into each area, only on empty pixels. */
  placeMany: (image: string, areas: Area[]) => Promise<void>;
};

/** A way to add a new picture to a tile that already has something on it. */
export type Placement = {
  kind: "replace" | "free" | "compose";
  label: string;
  area: Area;
};

/** A chat message plus what only the browser keeps: pictures and choices. */
export type ChatEntry = ChatMessage & {
  image?: string;
  placements?: Placement[];
};

export const UNREACHABLE = {
  ok: false,
  error: "Could not reach the server.",
} as const;

/** Said in the chat when the next step happens on the tile. */
export const ASK_SELECT =
  "Select the area on the tile you want to work on (Esc to cancel).";
export const ASK_FRAME =
  'Move or resize the highlighted frame on the tile if needed, then press "Generate here".';
export const NO_LAYER =
  "The selected layer can’t be drawn on. Pick a visible, unlocked layer (not a group or reference) in the Layers panel.";
