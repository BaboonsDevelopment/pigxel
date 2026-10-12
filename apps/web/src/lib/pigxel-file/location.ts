import type { DriveFile } from "./google-drive";

export type CloudTile = { id: string; name: string; version?: string };

export type TileLocation =
  { kind: "cloud"; tile: CloudTile } | { kind: "drive"; file: DriveFile };

export const LOCATION_LABELS: Record<TileLocation["kind"], string> = {
  cloud: "Pigxel cloud",
  drive: "Google Drive",
};
