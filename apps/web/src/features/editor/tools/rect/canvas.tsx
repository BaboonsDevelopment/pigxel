import { roundedRectPoints } from "@/lib/edit/raster";
import { DragStroke } from "../shared/drag-stroke";
import { paintShape } from "../shared/shapes";
import type { ToolCanvasProps } from "../types";

export function RectCanvas(props: ToolCanvasProps) {
  return (
    <DragStroke
      {...props}
      square
      render={(canvas) =>
        paintShape(
          canvas,
          (box, filled) =>
            roundedRectPoints(box, filled, props.pen.cornerRadius),
          props.pen.fillShapes,
        )
      }
    />
  );
}
