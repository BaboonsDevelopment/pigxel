import type { KeptSprite } from "@/components/pixel-canvas/use-sprite";
import type { PigxelDocument } from "@/lib/pigxel-file/format";

export type KeptTile = {
  sprite: KeptSprite;
  image: PigxelDocument;
  scale: number;
  savedAt: number;
};

const kept = new Map<string, KeptTile>();

export function keepTile(draftId: string, tile: KeptTile) {
  kept.set(draftId, tile);
}

export function keptTile(draftId: string, savedAt: number): KeptTile | null {
  const tile = kept.get(draftId);
  return tile?.savedAt === savedAt ? tile : null;
}

export function forgetTile(draftId: string) {
  kept.delete(draftId);
}
