import { paintGradient, rgbaOf } from "../../pixel-canvas/paint";
import { DragStroke } from "../shared/drag-stroke";
import type { ToolCanvasProps } from "../types";

export function GradientCanvas(props: ToolCanvasProps) {
  const { pen, paintOptions, sprite } = props;
  return (
    <DragStroke
      {...props}
      keepsColor={false}
      render={({ stroke, data }) => {
        const start = stroke.points[0]!;
        if (start.x === stroke.end.x && start.y === stroke.end.y) return;
        const primary = rgbaOf(pen.color);
        const secondary = rgbaOf(pen.secondary);
        const intermediate = pen.gradientColors
          .filter((color) => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(color))
          .map(rgbaOf);
        const palette = pen.gradientPaletteOnly
          ? sprite.palette.map(rgbaOf)
          : [];
        if (pen.gradientPaletteOnly && !palette.length) return;
        const colors = palette.length
          ? palette
          : [primary, ...intermediate, secondary];
        if (stroke.secondary) colors.reverse();
        paintGradient(
          data,
          start,
          stroke.end,
          colors[0]!,
          colors.at(-1)!,
          pen.gradientShape,
          pen.gradientDither,
          paintOptions,
          colors.slice(1, -1),
          pen.gradientPaletteOnly,
        );
      }}
    />
  );
}
