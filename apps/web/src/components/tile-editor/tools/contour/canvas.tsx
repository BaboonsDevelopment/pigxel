import { FreehandStroke } from "../shared/freehand";
import { penInk, polygonPixels } from "../shared/stroke";
import type { ToolCanvasProps } from "../types";

export function ContourCanvas(props: ToolCanvasProps) {
  const { pen, sprite } = props;
  return (
    <FreehandStroke
      {...props}
      ink={penInk}
      keepsColor={pen.ink !== "shading"}
      render={(canvas) =>
        canvas.paint(polygonPixels(sprite.size, canvas.stroke.points), true)
      }
    />
  );
}
