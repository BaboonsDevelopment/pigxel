export type ReviewStatus = "approved" | "fix" | "pending";

export type ReviewState = ReviewStatus | "changed";

export type ReviewIssue = {
  level: "error" | "warning";
  rule: string;
  message: string;
};

export type ReviewClip = {
  name: string;
  from: number;
  to: number;
  direction: string;
  ms: number;
};

export type ReviewTile = {
  key: string;
  pack: string;
  id: string;
  name: string;
  kind: "sprite" | "tile" | null;
  notes: string;
  hash: string;
  w: number;
  h: number;
  frames: number[];
  clips: ReviewClip[];
  issues: ReviewIssue[];
  blocked: boolean;
  state: ReviewState;
  note: string;
  premium: boolean;
};

export type ReviewTarget = {
  id: string;
  name: string;
  background: string | null;
};

export type ReviewBlock = {
  id: string;
  name: string;
  target: string | null;
  background: string | null;
  premium: boolean;
  issues: ReviewIssue[];
  tiles: ReviewTile[];
};

export type ReviewSnapshot = {
  blocks: ReviewBlock[];
  targets: ReviewTarget[];
  productionError: string | null;
};

export type ProductionAsset = {
  id: string;
  name: string;
  category: string;
  kind: "sprite" | "tile";
  width: number;
  height: number;
  frames: number;
  frameMs: number;
  premium: boolean;
  sheetUrl: string;
};

export type ReportAuthor = {
  id: string;
  username: string | null;
  banned: boolean;
};

export type ReportedArt = {
  id: string;
  name: string;
  thumbnail: string | null;
  visibility: string;
  author: ReportAuthor;
  reports: number;
  reasons: Record<string, number>;
  details: string[];
  lastAt: string;
};

export type ReportedComment = {
  id: string;
  body: string;
  tileId: string;
  tileName: string | null;
  author: ReportAuthor;
  reports: number;
  lastAt: string;
};

export type Reports = { arts: ReportedArt[]; comments: ReportedComment[] };

export type ArtAction = "keep" | "unpublish" | "delete" | "ban";
export type CommentAction = "keep" | "delete";
