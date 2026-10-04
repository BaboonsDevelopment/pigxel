import type { SpriteApi } from "../pixel-canvas/use-sprite";
import { safeFileBase } from "@/lib/pigxel-file/format";
import { tiledMap, tilesetImage } from "@/lib/tilemap/export";
import type { ExportFile } from "./export";

export function tilemapFiles(
  sprite: SpriteApi,
  fileName: string,
): ExportFile[] {
  const layer = sprite.activeLayer;
  if (layer?.kind !== "tilemap" || !layer.tiles.length) return [];
  const base = `${safeFileBase(fileName)}-${safeFileBase(layer.name)}`;
  const sheet = tilesetImage(layer.tiles, layer.tile);
  const image = `${base}-tileset.png`;
  const several = sprite.frames.length > 1;
  return [
    {
      name: image,
      mime: "image/png",
      image: { rgba: sheet.rgba, w: sheet.w, h: sheet.h },
    },
    {
      name: `${base}.tmj`,
      mime: "application/json",
      data: tiledMap({
        name: layer.name,
        size: sprite.size,
        tile: layer.tile,
        tiles: layer.tiles,
        flips: layer.flips,
        image: { file: image, w: sheet.w, h: sheet.h, columns: sheet.columns },
        frames: sprite.frames.map((frame, i) => ({
          name: several ? `${layer.name} · frame ${i + 1}` : layer.name,
          pixels: sprite.hasCel(frame.id, layer.id)
            ? sprite.readCel(layer.id, frame.id)
            : undefined,
        })),
      }),
    },
  ];
}
