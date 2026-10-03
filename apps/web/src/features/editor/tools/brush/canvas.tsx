import { fourConnected } from "@/components/pixel-canvas/pen";
import { FreehandStroke } from "../shared/freehand";
import { penInk } from "../shared/stroke";
import type { ToolCanvasProps } from "../types";

export function BrushCanvas(props: ToolCanvasProps) {
  const { pen, stamp } = props;
  return (
    <FreehandStroke
      {...props}
      ink={penInk}
      keepsColor={pen.ink !== "shading" && !stamp}
      joinsLast
      render={(canvas) =>
        stamp
          ? canvas.stamp(stamp)
          : canvas.paint(
              pen.brushShape === "line"
                ? fourConnected(canvas.stroke.points)
                : canvas.stroke.points,
            )
      }
    />
  );
}
