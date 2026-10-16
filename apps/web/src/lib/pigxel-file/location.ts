export type CloudTile = { id: string; name: string; version?: string };

/** Where a tile is kept. Pigxel cloud is the only home a tile can have. */
export type TileLocation = { kind: "cloud"; tile: CloudTile };

export const CLOUD_LABEL = "Pigxel cloud";

/** Shown for working copies not yet saved to Pigxel cloud. */
export const NOT_SAVED_LABEL = "Not saved";
