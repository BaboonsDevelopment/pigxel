import type { ToolId } from "./tools";
import type { DriveStatus } from "@/lib/google-drive/status";

export type EditorProps = {
  userId: string;
  tileId?: string;
  drive: DriveStatus;
  driveError?: boolean;
  guide?: string;
  canPublish?: boolean;
};

export type { ToolId };

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
  | "reselect"
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
  | "toggleOnion"
  | "togglePreview"
  | "toggleCanvasOnly"
  | "toggleFullScreen";

export type Shortcut = { command: Command } | { tool: ToolId };

export type OpenSource = "cloud" | "drive";

export type FileItem = {
  id: string;
  name: string;
  modified?: string;
  thumbnail?: string | null;
};

export type Listing =
  | { state: "loading" }
  | { state: "ready"; items: FileItem[] }
  | { state: "error"; message: string };
