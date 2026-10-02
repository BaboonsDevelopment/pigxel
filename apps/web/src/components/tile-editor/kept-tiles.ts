import type { KeptSprite } from "@/components/pixel-canvas/use-sprite";
import type { PigxelDocument } from "@/lib/pigxel-file/format";

/**
 * Tiles whose editor was left for another tab, kept in memory for this page
 * so switching back is instant and undo still reaches the earlier changes.
 */
export type KeptTile = {
  sprite: KeptSprite;
  /** The tile as it was left, the present of `sprite.history`. */
  image: PigxelDocument;
  scale: number;
  /** The draft's `savedAt` when it was left: a newer draft means it changed elsewhere. */
  savedAt: number;
};

const kept = new Map<string, KeptTile>();

export function keepTile(draftId: string, tile: KeptTile) {
  kept.set(draftId, tile);
}

/** The tile left in this page, unless its draft has changed since. */
export function keptTile(draftId: string, savedAt: number): KeptTile | null {
  const tile = kept.get(draftId);
  return tile?.savedAt === savedAt ? tile : null;
}

export function forgetTile(draftId: string) {
  kept.delete(draftId);
}
