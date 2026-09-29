import type { ReactNode } from "react";
import type { PaintTool } from "@/components/pixel-canvas/pen";
import type { DriveStatus } from "@/lib/google-drive/status";

export type EditorProps = {
  userId: string;
  /** The draft to edit, from the URL; the most recent one when missing. */
  tileId?: string;
  drive: DriveStatus;
  /** Connecting Google Drive was cancelled or failed on the way back. */
  driveError?: boolean;
};

export type ToolId = PaintTool;

export type Tool = {
  id: ToolId;
  label: string;
  /** Single key that selects the tool, as in Aseprite. */
  shortcut: string;
  icon: ReactNode;
};

/** What a keyboard shortcut does, besides picking a tool. */
export type Command =
  | "save"
  | "open"
  | "undo"
  | "redo"
  | "zoomIn"
  | "zoomOut"
  | "zoomReset"
  | "layerAbove"
  | "layerBelow"
  | "newLayer"
  | "clearLayer"
  | "newFrame"
  | "previousFrame"
  | "nextFrame"
  | "penSmaller"
  | "penBigger";

export type Shortcut = { command: Command } | { tool: ToolId };

/** The places a tile can be opened from in a dialog. */
export type OpenSource = "cloud" | "drive";

export type MenuItem = {
  label: string;
  shortcut?: string;
  onSelect: () => void;
  hidden?: boolean;
};

export type FileItem = {
  id: string;
  name: string;
  modified?: string;
  /** A small image of the tile, when the place keeps one. */
  thumbnail?: string | null;
};

export type Listing =
  | { state: "loading" }
  | { state: "ready"; items: FileItem[] }
  | { state: "error"; message: string };

/** Share of an area that may already be drawn on before a new picture there counts as covering art. */
export const MAX_OVERLAP = 0.03;
