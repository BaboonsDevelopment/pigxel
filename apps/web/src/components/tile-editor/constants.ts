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
  /** The key is pressed with Shift, e.g. Shift+U for the ellipse. */
  shift?: boolean;
  icon: ReactNode;
};

/** What a keyboard shortcut does, besides picking a tool. */
export type Command =
  | "save"
  | "open"
  | "export"
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
  | "penBigger"
  | "swapColors"
  | "selectAll"
  | "deselect"
  | "invertSelection"
  | "copy"
  | "cut"
  | "paste"
  | "dropSelection"
  | "flipHorizontal"
  | "flipVertical"
  | "rotateRight"
  | "nudgeUp"
  | "nudgeDown"
  | "nudgeLeft"
  | "nudgeRight"
  | "toggleOnion";

export type Shortcut = { command: Command } | { tool: ToolId };

/** The places a tile can be opened from in a dialog. */
export type OpenSource = "cloud" | "drive";

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
