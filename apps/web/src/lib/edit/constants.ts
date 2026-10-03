export const GRID = {
  transparent: ".",
  keep: "_",
  alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
} as const;

export const MIN_OBJECT_PIXELS = 6;
export const MAX_OBJECTS = 24;

export const EDIT_MARGIN = 2;
export const MAX_POINTS_PER_OP = 4096;

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

export const REDRAW_KEEP_DISTANCE = 48;
