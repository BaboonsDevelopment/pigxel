import { paintGradient, rgbaOf } from "@/components/pixel-canvas/paint";
import { DragStroke } from "../shared/drag-stroke";
import type { ToolCanvasProps } from "../types";

export function GradientCanvas(props: ToolCanvasProps) {
  const { pen, paintOptions } = props;
  return (
    <DragStroke
      {...props}
      keepsColor={false}
      render={({ stroke, data }) => {
        const start = stroke.points[0]!;
        if (start.x === stroke.end.x && start.y === stroke.end.y) return;
        const primary = rgbaOf(pen.color);
        const secondary = rgbaOf(pen.secondary);
        paintGradient(
          data,
          start,
          stroke.end,
          stroke.secondary ? secondary : primary,
          stroke.secondary ? primary : secondary,
          pen.gradientShape,
          pen.gradientDither,
          paintOptions,
        );
      }}
    />
  );
}
