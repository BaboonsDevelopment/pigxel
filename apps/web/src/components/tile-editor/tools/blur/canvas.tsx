import { blurInk } from "@/components/pixel-canvas/paint";
import { FreehandStroke } from "../shared/freehand";
import type { ToolCanvasProps } from "../types";

export function BlurCanvas(props: ToolCanvasProps) {
  return (
    <FreehandStroke
      {...props}
      ink={(stroke, { sprite }) => blurInk(stroke.before, sprite.size)}
      keepsColor={false}
      joinsLast
      render={(canvas) => canvas.paint(canvas.stroke.points)}
    />
  );
}
