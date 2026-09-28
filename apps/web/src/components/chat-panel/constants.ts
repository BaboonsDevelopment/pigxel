import type { Area } from "@/components/pixel-canvas/constants";
import type { ChatMessage } from "@/lib/ai/types";

export const SUGGESTIONS = [
  "make the eyes red",
  "draw a small green slime",
  "add a one-pixel outline",
];

/** What the chat needs from the canvas; the tile editor provides it. */
export type CanvasBridge = {
  isEmpty: () => boolean;
  fullArea: () => Area;
  freeArea: () => Area | null;
  snapshot: () => string;
  selectArea: () => Promise<Area | null>;
  highlight: (area: Area | null) => void;
  /** Turns a generated picture into pixel art and puts it into `area`. */
  place: (image: string, area: Area, replace: boolean) => Promise<void>;
};

/** A way to add a new picture to a tile that already has something on it. */
export type Placement = {
  kind: "replace" | "free" | "compose";
  label: string;
  area: Area;
};

/** A chat message plus what only the browser keeps: pictures and choices. */
export type ChatEntry = ChatMessage & {
  image?: string;
  placements?: Placement[];
};

export const UNREACHABLE = {
  ok: false,
  error: "Could not reach the server.",
} as const;
