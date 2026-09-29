import type { DriveFile } from "./google-drive";

/** A tile saved in Pigxel cloud: a row in `tiles` plus its file in Storage. */
export type CloudTile = { id: string; name: string };

/** Where a tile lives and autosaves to; null when it is only kept in this browser. */
export type TileLocation =
  { kind: "cloud"; tile: CloudTile } | { kind: "drive"; file: DriveFile };

export const LOCATION_LABELS: Record<TileLocation["kind"], string> = {
  cloud: "Pigxel cloud",
  drive: "Google Drive",
};
