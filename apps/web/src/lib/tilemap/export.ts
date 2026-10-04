import { gridOf, tileCells, type TileSize } from "./tilemap";

type Size = { w: number; h: number };

const FLIPPED_H = 0x80000000;
const FLIPPED_V = 0x40000000;
const FLIPPED_D = 0x20000000;

export function tilesetImage(tiles: Uint8ClampedArray[], tile: TileSize) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(tiles.length)));
  const rows = Math.max(1, Math.ceil(tiles.length / columns));
  const w = columns * tile.w;
  const h = rows * tile.h;
  const rgba = new Uint8ClampedArray(w * h * 4);
  tiles.forEach((pixels, i) => {
    const left = (i % columns) * tile.w;
    const top = Math.floor(i / columns) * tile.h;
    for (let y = 0; y < tile.h; y++)
      rgba.set(
        pixels.subarray(y * tile.w * 4, (y + 1) * tile.w * 4),
        ((top + y) * w + left) * 4,
      );
  });
  return { rgba, w, h, columns };
}

export function tiledMap({
  name,
  size,
  tile,
  tiles,
  flips,
  image,
  frames,
}: {
  name: string;
  size: Size;
  tile: TileSize;
  tiles: Uint8ClampedArray[];
  flips: boolean;
  image: { file: string; w: number; h: number; columns: number };
  frames: { name: string; pixels: Uint8ClampedArray | undefined }[];
}): string {
  const { cols, rows } = gridOf(size, tile);
  return JSON.stringify({
    type: "map",
    version: "1.10",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width: cols,
    height: rows,
    tilewidth: tile.w,
    tileheight: tile.h,
    nextlayerid: frames.length + 1,
    nextobjectid: 1,
    tilesets: [
      {
        firstgid: 1,
        name,
        image: image.file,
        imagewidth: image.w,
        imageheight: image.h,
        tilewidth: tile.w,
        tileheight: tile.h,
        tilecount: tiles.length,
        columns: image.columns,
        margin: 0,
        spacing: 0,
      },
    ],
    layers: frames.map((frame, i) => ({
      id: i + 1,
      name: frame.name,
      type: "tilelayer",
      x: 0,
      y: 0,
      width: cols,
      height: rows,
      opacity: 1,
      visible: i === 0,
      data: tileCells(frame.pixels, size, tile, tiles, flips).map((cell) =>
        !cell
          ? 0
          : cell.index +
            1 +
            (cell.flip.h ? FLIPPED_H : 0) +
            (cell.flip.v ? FLIPPED_V : 0) +
            (cell.flip.d ? FLIPPED_D : 0),
      ),
    })),
  });
}
