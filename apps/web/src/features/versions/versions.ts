export type TileVersion = {
  id: string;
  createdAt: string;
  author: string | null;
  width: number;
  height: number;
  thumbnail: string | null;
};

export const VERSION_EVERY_MS = 10 * 60 * 1000;
export const VERSIONS_KEPT = 50;
export const VERSIONS_BUCKET = "tile-versions";
