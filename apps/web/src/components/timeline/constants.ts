/** The panel's height in pixels, changed by dragging its top edge. */
export const PANEL_HEIGHT = { initial: 224, min: 120, max: 600 };

/** Width of the layer names column, which stays put while frames scroll. */
export const LAYER_COLUMN = "w-64";

/** Width of one frame's column. */
export const FRAME_COLUMN = "w-8";

/** A small toolbar button. */
export const ACTION =
  "flex h-7 items-center gap-1 rounded-md px-2 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-40";

/** Where a dragged layer lands relative to the row under the pointer. */
export type DropZone = "above" | "below" | "into";

/** Which side of a frame a dragged frame lands on. */
export type FrameSide = "before" | "after";
