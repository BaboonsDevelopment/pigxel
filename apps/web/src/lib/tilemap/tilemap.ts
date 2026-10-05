export type TileSize = { w: number; h: number };
export type TileMode = "manual" | "auto";
export type TileFlip = { d: boolean; h: boolean; v: boolean };
type Size = { w: number; h: number };
type Cel = Uint8ClampedArray | undefined;
type Match = { index: number; flip: TileFlip };

export const MIN_TILE = 1;
export const MAX_TILE = 256;
export const DEFAULT_TILE: TileSize = { w: 16, h: 16 };

export const NO_FLIP: TileFlip = { d: false, h: false, v: false };
export const FLIP_X: TileFlip = { d: false, h: true, v: false };
export const FLIP_Y: TileFlip = { d: false, h: false, v: true };
export const TURN_RIGHT: TileFlip = { d: true, h: true, v: false };

export const TILE_MODES: { value: TileMode; label: string; hint: string }[] = [
  {
    value: "manual",
    label: "Manual",
    hint: "Drawing on a tile changes every copy of it",
  },
  {
    value: "auto",
    label: "Auto",
    hint: "Drawing on a tile turns that spot into a new tile",
  },
];

export const gridOf = (size: Size, tile: TileSize) => ({
  cols: Math.ceil(size.w / tile.w),
  rows: Math.ceil(size.h / tile.h),
});

export const isSquareTile = (tile: TileSize) => tile.w === tile.h;

const isNoFlip = (flip: TileFlip) => !flip.d && !flip.h && !flip.v;

export function readCell(
  pixels: Cel,
  size: Size,
  tile: TileSize,
  col: number,
  row: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(tile.w * tile.h * 4);
  if (!pixels) return out;
  for (let y = 0; y < tile.h; y++) {
    const sy = row * tile.h + y;
    if (sy >= size.h) break;
    const w = Math.min(tile.w, size.w - col * tile.w);
    if (w <= 0) break;
    const from = (sy * size.w + col * tile.w) * 4;
    out.set(pixels.subarray(from, from + w * 4), y * tile.w * 4);
  }
  return out;
}

export function writeCell(
  pixels: Uint8ClampedArray,
  size: Size,
  tile: TileSize,
  col: number,
  row: number,
  content: Uint8ClampedArray | null,
) {
  for (let y = 0; y < tile.h; y++) {
    const sy = row * tile.h + y;
    if (sy >= size.h) break;
    const w = Math.min(tile.w, size.w - col * tile.w);
    if (w <= 0) break;
    const at = (sy * size.w + col * tile.w) * 4;
    if (content)
      pixels.set(content.subarray(y * tile.w * 4, (y * tile.w + w) * 4), at);
    else pixels.fill(0, at, at + w * 4);
  }
}

function isEmptyTile(tile: Uint8ClampedArray) {
  for (let i = 3; i < tile.length; i += 4) if (tile[i]) return false;
  return true;
}

function sameTile(a: Uint8ClampedArray, b: Uint8ClampedArray) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export function flipTile(
  pixels: Uint8ClampedArray,
  tile: TileSize,
  flip: TileFlip,
): Uint8ClampedArray {
  if (isNoFlip(flip)) return pixels;
  const { w, h } = tile;
  const out = new Uint8ClampedArray(pixels.length);
  for (let sy = 0; sy < h; sy++)
    for (let sx = 0; sx < w; sx++) {
      let x = flip.d ? sy : sx;
      let y = flip.d ? sx : sy;
      if (flip.h) x = w - 1 - x;
      if (flip.v) y = h - 1 - y;
      const from = (sy * w + sx) * 4;
      out.set(pixels.subarray(from, from + 4), (y * w + x) * 4);
    }
  return out;
}

const ALL_FLIPS: TileFlip[] = [false, true].flatMap((d) =>
  [false, true].flatMap((h) => [false, true].map((v) => ({ d, h, v }))),
);

const flipsFor = (tile: TileSize, enabled: boolean): TileFlip[] =>
  !enabled
    ? [NO_FLIP]
    : ALL_FLIPS.filter((flip) => !flip.d || isSquareTile(tile));

const inverseFlip = (flip: TileFlip): TileFlip =>
  flip.d ? { d: true, h: flip.v, v: flip.h } : flip;

export function composeFlips(first: TileFlip, then: TileFlip): TileFlip {
  const probe = new Uint8ClampedArray([
    ...[1, 0, 0, 0],
    ...[2, 0, 0, 0],
    ...[3, 0, 0, 0],
    ...[4, 0, 0, 0],
  ]);
  const square = { w: 2, h: 2 };
  const target = flipTile(flipTile(probe, square, first), square, then);
  return (
    ALL_FLIPS.find((flip) => sameTile(flipTile(probe, square, flip), target)) ??
    NO_FLIP
  );
}

const keyOf = (tile: Uint8ClampedArray) => {
  let key = "";
  for (let i = 0; i < tile.length; i += 4096)
    key += String.fromCharCode(...tile.subarray(i, i + 4096));
  return key;
};

class TileLookup {
  private keys = new Map<string, Match>();

  constructor(
    tiles: Uint8ClampedArray[],
    private tile: TileSize,
    private flips: TileFlip[],
  ) {
    tiles.forEach((pixels, index) => this.add(pixels, index));
  }

  add(pixels: Uint8ClampedArray, index: number) {
    for (const flip of this.flips) {
      const key = keyOf(flipTile(pixels, this.tile, flip));
      if (!this.keys.has(key)) this.keys.set(key, { index, flip });
    }
  }

  find(content: Uint8ClampedArray) {
    return this.keys.get(keyOf(content));
  }
}

function eachCell(
  size: Size,
  tile: TileSize,
  visit: (col: number, row: number) => void,
) {
  const { cols, rows } = gridOf(size, tile);
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) visit(col, row);
}

/** @public Not used yet. */
export function tileIndex(
  tiles: Uint8ClampedArray[],
  content: Uint8ClampedArray,
  tile: TileSize,
  flips = false,
) {
  return (
    new TileLookup(tiles, tile, flipsFor(tile, flips)).find(content)?.index ??
    -1
  );
}

export function withNewTiles(
  tiles: Uint8ClampedArray[],
  cels: Cel[],
  size: Size,
  tile: TileSize,
  flips = false,
): Uint8ClampedArray[] {
  const out = [...tiles];
  const lookup = new TileLookup(out, tile, flipsFor(tile, flips));
  for (const cel of cels)
    if (cel)
      eachCell(size, tile, (col, row) => {
        const content = readCell(cel, size, tile, col, row);
        if (isEmptyTile(content) || lookup.find(content)) return;
        lookup.add(content, out.length);
        out.push(content);
      });
  return out;
}

export function uniqueTiles(
  tiles: Uint8ClampedArray[],
  tile: TileSize,
  flips = false,
): Uint8ClampedArray[] {
  const out: Uint8ClampedArray[] = [];
  const lookup = new TileLookup([], tile, flipsFor(tile, flips));
  for (const pixels of tiles) {
    if (lookup.find(pixels)) continue;
    lookup.add(pixels, out.length);
    out.push(pixels);
  }
  return out;
}

function usedTiles(
  tiles: Uint8ClampedArray[],
  cels: Cel[],
  size: Size,
  tile: TileSize,
  flips = false,
): Uint8ClampedArray[] {
  const used = new Set<number>();
  const lookup = new TileLookup(tiles, tile, flipsFor(tile, flips));
  for (const cel of cels)
    if (cel)
      eachCell(size, tile, (col, row) => {
        const found = lookup.find(readCell(cel, size, tile, col, row));
        if (found) used.add(found.index);
      });
  return tiles.filter((_, i) => used.has(i));
}

export function syncTilemap({
  size,
  tile,
  tiles,
  before,
  after,
  mode,
  flips = false,
  written = new Set(),
  collect = true,
}: {
  size: Size;
  tile: TileSize;
  tiles: Uint8ClampedArray[];
  before: Cel[];
  after: Cel[];
  mode: TileMode | "place";
  flips?: boolean;
  written?: ReadonlySet<string>;
  collect?: boolean;
}): { cels: Cel[]; tiles: Uint8ClampedArray[]; written: Set<string> } {
  const cels = [...after];
  let next = [...tiles];
  const wrote = new Set(written);
  if (mode === "manual") {
    const lookup = new TileLookup(next, tile, flipsFor(tile, flips));
    const edits = new Map<number, Uint8ClampedArray>();
    const edited = new Set<string>();
    before.forEach((old, i) => {
      if (old === after[i]) return;
      eachCell(size, tile, (col, row) => {
        const cell = `${i}:${col}:${row}`;
        if (written.has(cell)) return;
        const from = readCell(old, size, tile, col, row);
        const to = readCell(after[i], size, tile, col, row);
        if (sameTile(from, to)) return;
        edited.add(cell);
        if (isEmptyTile(from) || isEmptyTile(to)) return;
        const found = lookup.find(from);
        if (!found || edits.has(found.index)) return;
        edits.set(found.index, flipTile(to, tile, inverseFlip(found.flip)));
      });
    });
    if (edits.size)
      before.forEach((old, i) => {
        const cel = cels[i];
        if (!old || !cel) return;
        let copy: Uint8ClampedArray | null = null;
        eachCell(size, tile, (col, row) => {
          const cell = `${i}:${col}:${row}`;
          if (edited.has(cell)) return;
          const found = lookup.find(readCell(old, size, tile, col, row));
          const to = found && edits.get(found.index);
          if (!found || !to) return;
          wrote.add(cell);
          const content = flipTile(to, tile, found.flip);
          if (sameTile(readCell(copy ?? cel, size, tile, col, row), content))
            return;
          copy ??= new Uint8ClampedArray(cel);
          writeCell(copy, size, tile, col, row, content);
        });
        if (copy) cels[i] = copy;
      });
    for (const [index, pixels] of edits) next[index] = pixels;
  }
  if (!collect) return { cels, tiles: next, written: wrote };
  next = withNewTiles(next, cels, size, tile, flips);
  if (mode === "auto") next = usedTiles(next, cels, size, tile, flips);
  return { cels, tiles: next, written: wrote };
}

export function tileCells(
  pixels: Cel,
  size: Size,
  tile: TileSize,
  tiles: Uint8ClampedArray[],
  flips = false,
): (Match | null)[] {
  const lookup = new TileLookup(tiles, tile, flipsFor(tile, flips));
  const cells: (Match | null)[] = [];
  eachCell(size, tile, (col, row) => {
    const content = readCell(pixels, size, tile, col, row);
    cells.push(isEmptyTile(content) ? null : (lookup.find(content) ?? null));
  });
  return cells;
}
