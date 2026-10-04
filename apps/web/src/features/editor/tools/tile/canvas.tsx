"use client";

import { useImperativeHandle, useRef } from "react";
import type { Point } from "../../pixel-canvas/pen";
import type { ToolCanvasProps } from "../types";

export function TileCanvas({ ref, sprite, selection }: ToolCanvasProps) {
  const drawing = useRef<{ erase: boolean; last: string | null } | null>(null);
  const layer = sprite.activeLayer;

  useImperativeHandle(ref, () => {
    const cellOf = (point: Point) =>
      layer?.kind === "tilemap"
        ? {
            col: Math.floor(point.x / layer.tile.w),
            row: Math.floor(point.y / layer.tile.h),
          }
        : null;
    const put = (point: Point) => {
      const cell = cellOf(point);
      const stroke = drawing.current;
      if (!cell || !stroke) return;
      const key = `${cell.col}:${cell.row}`;
      if (key === stroke.last) return;
      stroke.last = key;
      sprite.placeTile(
        cell.col,
        cell.row,
        stroke.erase ? null : sprite.activeTile,
      );
    };
    return {
      down(e, point) {
        if (layer?.kind !== "tilemap" || !sprite.canPaint) return;
        const cell = cellOf(point);
        if (!cell) return;
        if (e.altKey) {
          sprite.pickTile(cell.col, cell.row);
          return;
        }
        const erase = e.button === 2;
        if (!erase && !layer.tiles[sprite.activeTile]) return;
        selection.drop();
        e.currentTarget.setPointerCapture(e.pointerId);
        drawing.current = { erase, last: null };
        put(point);
      },
      move(_e, passed) {
        for (const point of passed) put(point);
      },
      up() {
        if (!drawing.current) return;
        drawing.current = null;
        sprite.finishPlacing();
      },
    };
  });
  return null;
}
