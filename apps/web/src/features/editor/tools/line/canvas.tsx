import { linePoints } from "@/components/pixel-canvas/pen";
import { DragStroke } from "../shared/drag-stroke";
import type { ToolCanvasProps } from "../types";

export function LineCanvas(props: ToolCanvasProps) {
  return (
    <DragStroke
      {...props}
      continuesFromEnd
      render={({ stroke, paint }) =>
        paint(linePoints(stroke.points[0]!, stroke.end))
      }
    />
  );
}
