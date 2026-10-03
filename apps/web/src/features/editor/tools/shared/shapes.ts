import { boxBetween } from "../../pixel-canvas/helpers";
import type { Area } from "../../pixel-canvas/constants";
import type { Point } from "../../pixel-canvas/pen";
import type { StrokeCanvas } from "./stroke";

export function paintShape(
  { stroke, paint }: StrokeCanvas,
  shape: (box: Area, filled: boolean) => Point[],
  filled: boolean,
) {
  const box = boxBetween(stroke.points[0]!, stroke.end);
  if (filled) paint(shape(box, true), true);
  paint(shape(box, false));
}
