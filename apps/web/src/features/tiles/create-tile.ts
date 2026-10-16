import { loadAssetDocument, type Asset } from "@/features/assets/assets";
import { moveTileToFolder } from "@/features/tiles/actions";
import type { StartKind } from "@/features/editor/constants";
import type { PalettePreset } from "@/lib/palette/presets";
import { CloudError, saveCloudTile } from "@/lib/pigxel-file/cloud";
import { createDraft, loadDrafts } from "@/lib/pigxel-file/draft";
import {
  blankDocument,
  serializePigxel,
  type Background,
  type PigxelDocument,
} from "@/lib/pigxel-file/format";
import { thumbnailDataUrl } from "@/lib/pigxel-file/thumbnail";
import { createFrame } from "@/lib/sprite/frames";
import { writeNewTileDefaults } from "./new-tile-defaults";

export type NewTile = {
  userId: string;
  name: string;
  width: number;
  height: number;
  background: Background;
  fill?: string;
  folder?: { id: string; name: string };
  asset?: Asset | null;
  palette?: PalettePreset | null;
  start?: StartKind;
};

/** Creates a tile in Pigxel cloud and a working copy to open in the editor. */
export async function createTile(
  tile: NewTile,
): Promise<{ draftId: string } | { error: string }> {
  const { userId, name, width, height, background, folder } = tile;
  let image: PigxelDocument;
  try {
    image = tile.asset
      ? await loadAssetDocument(tile.asset)
      : blankDocument(width, height, background);
  } catch {
    return { error: "Couldn’t load the asset. Try again." };
  }
  if (tile.fill && !tile.asset) image = filledBackground(image, tile.fill);
  if (tile.palette && !tile.asset) image.palette = [...tile.palette.colors];
  if (tile.start === "animation" && !tile.asset) image = withFrames(image, 4);
  const file = serializePigxel(image);
  let saved;
  try {
    saved = await saveCloudTile({ name }, file, image, thumbnailDataUrl(image));
    if (folder) {
      const moved = await moveTileToFolder(saved.id, folder.id);
      if (moved.error) throw new CloudError(moved.error);
    }
  } catch (e) {
    return {
      error:
        e instanceof CloudError
          ? e.message
          : "Couldn’t create the tile. Try again.",
    };
  }
  await loadDrafts(userId);
  const draft = createDraft(userId, {
    name,
    file,
    location: { kind: "cloud", tile: saved },
    dirty: false,
  });
  if (!draft)
    return {
      error:
        "The tile was saved, but this browser won’t keep a working copy. Allow site data for Pigxel, or remove some tiles from this browser, and open it from My projects.",
    };
  if (!tile.asset) writeNewTileDefaults(userId, { width, height, background });
  return { draftId: draft.id };
}

function filledBackground(doc: PigxelDocument, color: string): PigxelDocument {
  const layer = doc.layers.find((l) => l.kind === "background");
  const frame = doc.frames[0];
  const cel = layer && frame ? doc.cels.get(frame.id)?.get(layer.id) : null;
  if (!cel) return doc;
  const rgb = [1, 3, 5].map((at) => parseInt(color.slice(at, at + 2), 16));
  for (let i = 0; i < cel.length; i += 4) cel.set([...rgb, 255], i);
  return doc;
}

function withFrames(doc: PigxelDocument, count: number): PigxelDocument {
  const first = doc.frames[0]!;
  const base = doc.cels.get(first.id) ?? new Map();
  const frames = [
    first,
    ...Array.from({ length: count - 1 }, () => createFrame(first.duration)),
  ];
  const cels = new Map(doc.cels);
  for (const frame of frames.slice(1))
    cels.set(
      frame.id,
      new Map(
        [...base].map(([layer, pixels]) => [
          layer,
          new Uint8ClampedArray(pixels),
        ]),
      ),
    );
  return { ...doc, frames, cels };
}
