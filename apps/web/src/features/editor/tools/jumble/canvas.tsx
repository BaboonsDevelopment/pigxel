import { jumbleInk } from "../../pixel-canvas/paint";
import { FreehandStroke } from "../shared/freehand";
import type { ToolCanvasProps } from "../types";

export function JumbleCanvas(props: ToolCanvasProps) {
  return (
    <FreehandStroke
      {...props}
      ink={(stroke, { sprite }) =>
        jumbleInk(stroke.before, sprite.size, stroke.seed)
      }
      keepsColor={false}
      joinsLast
      render={(canvas) => canvas.paint(canvas.stroke.points)}
    />
  );
}
