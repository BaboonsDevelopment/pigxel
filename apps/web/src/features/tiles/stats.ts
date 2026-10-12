export type ArtStats = {
  id: string;
  name: string;
  thumbnail: string | null;
  views: number;
  likes: number;
  downloads: number;
  comments: number;
};

export const STAT_KEYS = ["views", "likes", "downloads", "comments"] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export function totalStats(arts: ArtStats[]): Record<StatKey, number> {
  return {
    views: arts.reduce((sum, art) => sum + art.views, 0),
    likes: arts.reduce((sum, art) => sum + art.likes, 0),
    downloads: arts.reduce((sum, art) => sum + art.downloads, 0),
    comments: arts.reduce((sum, art) => sum + art.comments, 0),
  };
}
