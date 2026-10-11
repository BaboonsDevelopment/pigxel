import { ellipsePoints } from "@/lib/edit/raster";
import { DragStroke } from "../shared/drag-stroke";
import { paintShape } from "../shared/shapes";
import type { ToolCanvasProps } from "../types";

export function EllipseCanvas(props: ToolCanvasProps) {
  return (
    <DragStroke
      {...props}
      square
      fromCenter
      render={(canvas) =>
        paintShape(canvas, ellipsePoints, props.pen.fillShapes)
      }
    />
  );
}
