import type { PublicTile } from "@/features/profile/profile";

/**
 * Arts someone just clicked, kept in this tab: their page shows them at once
 * (art-page-shell) while the server loads the rest. Only what the card
 * already showed, so nothing here is newer than the page that replaces it.
 */
const recent = new Map<string, PublicTile>();
const KEEP = 50;

export function rememberArt(tile: PublicTile) {
  recent.delete(tile.id);
  recent.set(tile.id, tile);
  if (recent.size > KEEP) recent.delete(recent.keys().next().value!);
}

export const recallArt = (id: string) => recent.get(id) ?? null;
