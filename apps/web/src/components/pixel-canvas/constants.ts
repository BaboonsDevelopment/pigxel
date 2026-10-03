import type { CSSProperties } from "react";

export type Edge = "e" | "s" | "se";
export type Size = { w: number; h: number };
export type ResizeDrag = { edge: Edge; x: number; y: number } & Size;
export type Area = { x: number; y: number } & Size;

export const DEFAULT_SCALE = 16;
export const MIN_SCALE = 2;
export const MAX_SCALE = 48;
export const ZOOM_FACTOR = 1.15;
export type FrameEdges = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

const edges = (sides: string): FrameEdges => ({
  left: sides.includes("w"),
  right: sides.includes("e"),
  top: sides.includes("n"),
  bottom: sides.includes("s"),
});

export const FRAME_HANDLES = [
  {
    side: "nw",
    edges: edges("nw"),
    className: "-top-1.5 -left-1.5 size-3 cursor-nwse-resize",
  },
  {
    side: "ne",
    edges: edges("ne"),
    className: "-top-1.5 -right-1.5 size-3 cursor-nesw-resize",
  },
  {
    side: "sw",
    edges: edges("sw"),
    className: "-bottom-1.5 -left-1.5 size-3 cursor-nesw-resize",
  },
  {
    side: "se",
    edges: edges("se"),
    className: "-right-1.5 -bottom-1.5 size-3 cursor-nwse-resize",
  },
  {
    side: "n",
    edges: edges("n"),
    className: "-top-1 left-1/2 h-2 w-5 -translate-x-1/2 cursor-ns-resize",
  },
  {
    side: "s",
    edges: edges("s"),
    className: "-bottom-1 left-1/2 h-2 w-5 -translate-x-1/2 cursor-ns-resize",
  },
  {
    side: "w",
    edges: edges("w"),
    className: "top-1/2 -left-1 h-5 w-2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    side: "e",
    edges: edges("e"),
    className: "top-1/2 -right-1 h-5 w-2 -translate-y-1/2 cursor-ew-resize",
  },
];
export const MOVE_FRAME: FrameEdges = edges("nsew");

export const MIN_PLACEMENT_SIDE = 16;
export const SNAPSHOT_SIDE = 512;
export const SNAPSHOT_BACKGROUND = "#d4d4d4";
export const MIN_SIZE = 1;
export const MAX_SIZE = 256;

export const HANDLES: { edge: Edge; title: string; className: string }[] = [
  {
    edge: "e",
    title: "Drag to change the width",
    className: "inset-y-0 -right-2 w-4 cursor-ew-resize after:h-9 after:w-1",
  },
  {
    edge: "s",
    title: "Drag to change the height",
    className: "inset-x-0 -bottom-2 h-4 cursor-ns-resize after:h-1 after:w-9",
  },
  {
    edge: "se",
    title: "Drag to resize",
    className: "-right-2 -bottom-2 size-4 cursor-nwse-resize after:size-2.5",
  },
];

export const CHECKER_STYLE: CSSProperties = {
  backgroundColor: "#fff",
  backgroundImage: [
    "linear-gradient(45deg, #d9d9e0 25%, transparent 25%)",
    "linear-gradient(-45deg, #d9d9e0 25%, transparent 25%)",
    "linear-gradient(45deg, transparent 75%, #d9d9e0 75%)",
    "linear-gradient(-45deg, transparent 75%, #d9d9e0 75%)",
  ].join(", "),
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0",
};

export const GRID_STYLE: CSSProperties = {
  backgroundImage: [
    "linear-gradient(to right, rgba(127,127,127,0.3) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(127,127,127,0.3) 1px, transparent 1px)",
  ].join(", "),
};

export const MAJOR_GRID_STYLE: CSSProperties = {
  backgroundImage: [
    "linear-gradient(to right, rgba(59,130,246,0.55) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(59,130,246,0.55) 1px, transparent 1px)",
  ].join(", "),
};

export const MAX_UNDO = 100;
