import type { CSSProperties } from "react";

export type Edge = "e" | "s" | "se";
export type Size = { w: number; h: number };
export type ResizeDrag = { edge: Edge; x: number; y: number } & Size;

/** Screen pixels per tile pixel. */
export const SCALE = 16;
export const MIN_SIZE = 1;
export const MAX_SIZE = 256;
export const DEFAULT_SIZE: Size = { w: 32, h: 32 };

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

/** Checkerboard shown through transparent pixels. */
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

/** One grid cell per tile pixel. */
export const GRID_STYLE: CSSProperties = {
  backgroundImage: [
    "linear-gradient(to right, rgba(127,127,127,0.3) 1px, transparent 1px)",
    "linear-gradient(to bottom, rgba(127,127,127,0.3) 1px, transparent 1px)",
  ].join(", "),
  backgroundSize: `${SCALE}px ${SCALE}px`,
};
