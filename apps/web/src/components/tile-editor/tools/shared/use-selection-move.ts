import { useEffect, useEffectEvent, useRef } from "react";
import type { Point } from "@/components/pixel-canvas/pen";
import type { CanvasPointer, ToolContext } from "../types";

export function useSelectionMove({ sprite, selection }: ToolContext) {
  const from = useRef<Point>(null);

  const end = () => {
    if (!from.current) return false;
    from.current = null;
    selection.endMove();
    return true;
  };
  const leave = useEffectEvent(end);
  useEffect(() => () => void leave(), []);

  return {
    start(e: CanvasPointer, point: Point, whole: boolean) {
      if (!sprite.canPaint) return;
      if (!selection.beginMove(whole)) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      from.current = point;
    },
    move(point: Point) {
      const start = from.current;
      if (!start) return false;
      selection.moveTo(point.x - start.x, point.y - start.y);
      return true;
    },
    end,
  };
}
