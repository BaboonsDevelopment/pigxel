import type { Area, Size } from "@/components/pixel-canvas/constants";
import type { AnimationSpec } from "@/components/pixel-canvas/use-sprite";
import type { ChatMessage } from "@/lib/ai/types";

export const SUGGESTIONS = [
  "make the eyes red",
  "draw a small green slime",
  "a monkey that throws a grenade",
];

/** A drawing layer as the AI sees it, with what it shows in the current frame. */
export type LayerInfo = {
  id: string;
  name: string;
  /** Shown and unlocked, so the AI may change it. */
  editable: boolean;
  /** The box around what is drawn on it in the current frame, or null. */
  box: Area | null;
};

/** A separate drawn thing in the current frame, and the layer it is on. */
export type TileObject = { area: Area; layerId: string };

/**
 * What the chat needs from the editor; the tile editor provides it. It always
 * works on the latest state of the tile, even across a slow AI request.
 * "The tile" means the current frame with every layer combined; cels are
 * addressed by layer and frame id and hold full-tile RGBA.
 */
export type CanvasBridge = {
  size: () => Size;
  isEmpty: () => boolean;
  freeArea: () => Area | null;
  /** The tile (or `area`) as an enlarged PNG data URL. */
  snapshot: (area?: Area, background?: string) => string;
  /** True when noticeably much of `area` is already drawn on, on any layer. */
  overlapsDrawing: (area: Area) => boolean;
  /** The drawing layers, top first (no groups, references or Background). */
  layers: () => LayerInfo[];
  /** Separate drawn things on every shown drawing layer, biggest first. */
  objects: () => TileObject[];
  /** The selected layer, and the frame on screen. */
  activeLayer: () => string;
  frameId: () => string;
  /** The frames in which a layer has something drawn, in playing order. */
  framesOf: (layerId: string) => string[];
  readCel: (layerId: string, frameId: string) => Uint8ClampedArray;
  /** Replaces cels of a layer (null empties one), as one undo step. */
  writeCels: (
    layerId: string,
    cels: Map<string, Uint8ClampedArray | null>,
  ) => void;
  /** `area` of one cel alone, as an enlarged PNG data URL. */
  snapshotCel: (
    layerId: string,
    frameId: string,
    area: Area,
    /** Null keeps it transparent. */
    background: string | null,
  ) => string;
  /**
   * Adds a layer called `name` showing `pixels` in every frame. With
   * `replace`, the other drawing layers are hidden (not deleted), so the new
   * picture takes the place of what was drawn.
   */
  addLayer: (
    name: string,
    pixels: Uint8ClampedArray,
    replace: boolean,
  ) => string;
  /**
   * Moves what a layer shows inside `area` to a new layer called `name`
   * above it, as one undo step; returns the new layer's id.
   */
  cutToLayer: (layerId: string, area: Area, name: string) => string;
  addAnimation: (spec: AnimationSpec) => void;
  /** Starts playing the animation. */
  play: () => void;
  /** Takes back the last change, as Ctrl+Z; false when there is none. */
  undo: () => boolean;
  selectArea: () => Promise<Area | null>;
  /** Lets the user move and resize a proposed area; null when they cancel. */
  adjustArea: (area: Area) => Promise<Area | null>;
  highlight: (area: Area | null) => void;
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
  /** The id of `image` in the browser's cache, once kept there. */
  picture?: string;
  placements?: Placement[];
  /** A step that waits for the user, e.g. paid pictures to confirm. */
  button?: { label: string; run: () => Promise<boolean> };
};

/** What the AI flows (generate, edit, animate) use of the chat. */
export type Chat = {
  canvas: CanvasBridge;
  /** The conversation so far, without the latest reply. */
  messages: ChatEntry[];
  /** Whether the user wants to pick the area on the tile first. */
  selectArea: boolean;
  append: (entry: ChatEntry) => void;
  say: (content: string) => void;
  setPending: (pending: boolean) => void;
  setError: (error: string | null) => void;
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
  "That layer is hidden or locked. Show and unlock it in the timeline, then ask again.";

/** Share of an area that may already be drawn on before a new picture there counts as covering art. */
export const MAX_OVERLAP = 0.03;

/** The panel's width in pixels, changed by dragging its left edge. */
export const PANEL_WIDTH = { initial: 340, min: 260, max: 640 };
