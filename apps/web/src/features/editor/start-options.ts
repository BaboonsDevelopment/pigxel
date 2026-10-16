import { MAX_TILE, MIN_TILE, type TileSize } from "@/lib/tilemap/tilemap";

/**
 * What a "start" modal on Home hands to the editor for a new tile: the
 * Generate with AI prompt, or the tile size of a new tilemap. Kept per draft
 * in this tab's session storage, so nothing long ends up in the address bar.
 */
export type StartOptions = { prompt?: string; tile?: TileSize };

/** Longest prompt the AI helper reads (the moderation check's limit). */
export const MAX_START_PROMPT = 4000;

const keyOf = (draftId: string) => `pigxel:start:${draftId}`;

const validTile = (tile: unknown): tile is TileSize => {
  const { w, h } = (tile ?? {}) as Partial<TileSize>;
  return [w, h].every(
    (side) =>
      Number.isInteger(side) &&
      (side as number) >= MIN_TILE &&
      (side as number) <= MAX_TILE,
  );
};

export function keepStartOptions(draftId: string, options: StartOptions) {
  try {
    window.sessionStorage.setItem(keyOf(draftId), JSON.stringify(options));
  } catch {}
}

export function readStartOptions(draftId: string): StartOptions {
  try {
    const raw = JSON.parse(
      window.sessionStorage.getItem(keyOf(draftId)) ?? "{}",
    ) as Record<string, unknown>;
    return {
      ...(typeof raw.prompt === "string" &&
        raw.prompt.trim() && {
          prompt: raw.prompt.slice(0, MAX_START_PROMPT),
        }),
      ...(validTile(raw.tile) && { tile: raw.tile }),
    };
  } catch {
    return {};
  }
}

export function forgetStartOptions(draftId: string) {
  try {
    window.sessionStorage.removeItem(keyOf(draftId));
  } catch {}
}
