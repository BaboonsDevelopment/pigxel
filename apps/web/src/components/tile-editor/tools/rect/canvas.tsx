import { rectPoints } from "@/lib/edit/raster";
import { DragStroke } from "../shared/drag-stroke";
import { paintShape } from "../shared/shapes";
import type { ToolCanvasProps } from "../types";

export function RectCanvas(props: ToolCanvasProps) {
  return (
    <DragStroke
      {...props}
      square
      render={(canvas) => paintShape(canvas, rectPoints, props.pen.fillShapes)}
    />
  );
}
