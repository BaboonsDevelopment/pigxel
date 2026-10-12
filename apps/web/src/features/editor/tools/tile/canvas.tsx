"use client";

import { useImperativeHandle, useRef, useState } from "react";
import { linePoints, type Point } from "../../pixel-canvas/pen";
import { cellArea, gridOf } from "@/lib/tilemap/tilemap";
import { GUIDE, ToolSvg } from "../shared/overlays";
import type { ToolCanvasProps } from "../types";

type Cell = { col: number; row: number };

export function TileCanvas({ ref, sprite, selection, scale }: ToolCanvasProps) {
  const drawing = useRef<{ erase: boolean; last: Cell | null } | null>(null);
  const [area, setArea] = useState<{
    from: Cell;
    to: Cell;
    erase: boolean;
  } | null>(null);
  const layer = sprite.activeLayer;
  const tile = layer?.kind === "tilemap" ? layer.tile : null;
  const grid = tile && gridOf(sprite.size, tile);

  const cellOf = (point: Point): Cell | null =>
    tile && grid
      ? {
          col: Math.max(
            0,
            Math.min(grid.cols - 1, Math.floor(point.x / tile.w)),
          ),
          row: Math.max(
            0,
            Math.min(grid.rows - 1, Math.floor(point.y / tile.h)),
          ),
        }
      : null;

  const box = (from: Cell, to: Cell) => ({
    col: Math.min(from.col, to.col),
    row: Math.min(from.row, to.row),
    cols: Math.abs(to.col - from.col) + 1,
    rows: Math.abs(to.row - from.row) + 1,
  });

  useImperativeHandle(ref, () => {
    const put = (point: Point) => {
      const cell = cellOf(point);
      const stroke = drawing.current;
      if (!cell || !stroke) return;
      const last = stroke.last;
      if (last && last.col === cell.col && last.row === cell.row) return;
      stroke.last = cell;
      sprite.placeTiles(
        (last
          ? linePoints(
              { x: last.col, y: last.row },
              { x: cell.col, y: cell.row },
            )
          : [{ x: cell.col, y: cell.row }]
        ).map((p) => ({ col: p.x, row: p.y })),
        stroke.erase ? null : sprite.activeTile,
      );
    };
    return {
      down(e, point) {
        if (layer?.kind !== "tilemap" || !sprite.canPaint) return;
        const cell = cellOf(point);
        if (!cell) return;
        const erase = e.button === 2;
        if (e.altKey && !e.shiftKey) {
          sprite.pickTile(cell.col, cell.row);
          return;
        }
        if (!erase && !layer.tiles[sprite.activeTile]) return;
        selection.drop();
        if (e.altKey) {
          sprite.placeTiles(
            cellArea(
              sprite.readCel(layer.id, sprite.frameId),
              sprite.size,
              layer.tile,
              cell,
            ),
            erase ? null : sprite.activeTile,
          );
          sprite.finishPlacing();
          return;
        }
        e.currentTarget.setPointerCapture(e.pointerId);
        if (e.shiftKey) return setArea({ from: cell, to: cell, erase });
        drawing.current = { erase, last: null };
        put(point);
      },
      move(_e, passed) {
        const point = passed.at(-1);
        if (area && point) {
          const cell = cellOf(point);
          if (cell && (cell.col !== area.to.col || cell.row !== area.to.row))
            setArea({ ...area, to: cell });
          return;
        }
        for (const p of passed) put(p);
      },
      up() {
        if (area) {
          const { col, row, cols, rows } = box(area.from, area.to);
          const cells: Cell[] = [];
          for (let r = row; r < row + rows; r++)
            for (let c = col; c < col + cols; c++)
              cells.push({ col: c, row: r });
          setArea(null);
          sprite.placeTiles(cells, area.erase ? null : sprite.activeTile);
          sprite.finishPlacing();
          return;
        }
        if (!drawing.current) return;
        drawing.current = null;
        sprite.finishPlacing();
      },
    };
  });

  if (!area || !tile) return null;
  const { col, row, cols, rows } = box(area.from, area.to);
  const rect = {
    x: col * tile.w,
    y: row * tile.h,
    w: cols * tile.w,
    h: rows * tile.h,
  };
  return (
    <>
      <ToolSvg size={sprite.size}>
        <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} {...GUIDE} />
      </ToolSvg>
      <span
        className="pointer-events-none absolute rounded bg-blue-500 px-2 py-0.5 text-xs whitespace-nowrap text-white tabular-nums"
        style={{
          left: (rect.x + rect.w) * scale,
          top: (rect.y + rect.h) * scale + 4,
        }}
      >
        {cols} × {rows} {cols * rows === 1 ? "tile" : "tiles"}
      </span>
    </>
  );
}
