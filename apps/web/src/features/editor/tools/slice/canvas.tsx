"use client";

import { useImperativeHandle, useState } from "react";
import { areaBetween } from "@/components/pixel-canvas/helpers";
import type { Point } from "@/components/pixel-canvas/pen";
import {
  nextSliceName,
  resizedSlice,
  sliceAt,
  type Slice,
} from "@/lib/slices/slices";
import type { ToolCanvasProps } from "../types";
import { SliceOverlay } from "./slice-overlay";

type SliceDrag =
  | { kind: "new"; from: Point; to: Point }
  | { kind: "move"; id: string; from: Point; dx: number; dy: number };

export function SliceCanvas({
  ref,
  sprite,
  scale,
  stretch,
  sliceId,
  onSelectSlice,
}: ToolCanvasProps) {
  const [drag, setDrag] = useState<SliceDrag | null>(null);

  useImperativeHandle(ref, () => ({
    down(e, p) {
      if (e.button !== 0) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      const picked = sprite.slices.find((s) => s.id === sliceId);
      const hit =
        picked && sliceAt([picked], p.x, p.y)
          ? picked
          : sliceAt(sprite.slices, p.x, p.y);
      if (hit) {
        onSelectSlice?.(hit.id);
        setDrag({ kind: "move", id: hit.id, from: p, dx: 0, dy: 0 });
      } else setDrag({ kind: "new", from: p, to: p });
    },
    move(_, passed) {
      const p = passed.at(-1);
      if (!drag || !p) return;
      if (drag.kind === "new") {
        if (p.x !== drag.to.x || p.y !== drag.to.y) setDrag({ ...drag, to: p });
        return;
      }
      const dx = p.x - drag.from.x;
      const dy = p.y - drag.from.y;
      if (dx !== drag.dx || dy !== drag.dy) setDrag({ ...drag, dx, dy });
    },
    up() {
      setDrag(null);
      if (!drag) return;
      if (drag.kind === "move") {
        if (!drag.dx && !drag.dy) return;
        return sprite.setSlices(
          sprite.slices.map((s) =>
            s.id === drag.id
              ? {
                  ...s,
                  bounds: {
                    ...s.bounds,
                    x: s.bounds.x + drag.dx,
                    y: s.bounds.y + drag.dy,
                  },
                }
              : s,
          ),
        );
      }
      if (drag.from.x === drag.to.x && drag.from.y === drag.to.y)
        return onSelectSlice?.(null);
      const slice: Slice = {
        id: crypto.randomUUID(),
        name: nextSliceName(sprite.slices),
        bounds: areaBetween(drag.from, drag.to, sprite.size),
        center: null,
        pivot: null,
      };
      sprite.setSlices([...sprite.slices, slice]);
      onSelectSlice?.(slice.id);
    },
  }));

  return (
    <SliceOverlay
      slices={sprite.slices}
      size={sprite.size}
      scale={scale}
      stretch={stretch}
      pickedId={sliceId}
      drag={drag}
      onResize={(bounds) =>
        sprite.setSlices(
          sprite.slices.map((s) =>
            s.id === sliceId ? resizedSlice(s, bounds) : s,
          ),
        )
      }
    />
  );
}
