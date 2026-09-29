// Settings of the AI pixel edits (see ops.ts and codec.ts).

/** Symbols in the text grid the AI reads and writes. */
export const GRID = {
  transparent: ".",
  /** In blit rows: leave the pixel as it is. */
  keep: "_",
  /** One character per colour. */
  alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
} as const;

/** Smallest group of pixels that counts as a separate drawn thing. */
export const MIN_OBJECT_PIXELS = 6;
/** How many drawn things the planner is told about, biggest first. */
export const MAX_OBJECTS = 24;

/** Pixels kept around the drawing when the edit area is cropped to it. */
export const EDIT_MARGIN = 2;
/** Cap on coordinates in one `px` operation. */
export const MAX_POINTS_PER_OP = 4096;

/** Operations the AI may answer with; the table goes into its prompt. */
export const OPS = [
  {
    syntax: "pal <char> <#rrggbb>",
    doc: "new char: add a colour; existing char: recolour all its pixels",
  },
  { syntax: "px <char> <x,y> <x,y> ...", doc: "set individual pixels" },
  {
    syntax: "blit <x,y> <rows>",
    doc: 'overwrite a rectangle; rows separated by "/"',
  },
  {
    syntax: "rect <char> <x,y> <w>x<h>",
    doc: 'rectangle outline; add "fill" for solid',
  },
  {
    syntax: "ellipse <char> <x,y> <w>x<h>",
    doc: 'ellipse outline; add "fill" for solid',
  },
  { syntax: "line <char> <x1,y1> <x2,y2>", doc: "straight line" },
  {
    syntax: "bucket <char> <x,y>",
    doc: "flood fill the area containing that pixel",
  },
  {
    syntax: "swap <fromChar> <toChar>",
    doc: "recolour every pixel of one colour",
  },
  {
    syntax: "mirror v | mirror h",
    doc: "copy the left half onto the right (or top onto bottom)",
  },
  { syntax: "clear", doc: "erase everything in the area" },
] as const;

/**
 * A redrawn pixel this close to the original keeps the original colour, so
 * only what the AI really changed lands on the tile.
 */
export const REDRAW_KEEP_DISTANCE = 48;
