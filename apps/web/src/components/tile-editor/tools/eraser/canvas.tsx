import { FreehandStroke } from "../shared/freehand";
import type { ToolCanvasProps } from "../types";

export function EraserCanvas(props: ToolCanvasProps) {
  return (
    <FreehandStroke
      {...props}
      erase
      joinsLast
      render={(canvas) => canvas.paint(canvas.stroke.points)}
    />
  );
}
