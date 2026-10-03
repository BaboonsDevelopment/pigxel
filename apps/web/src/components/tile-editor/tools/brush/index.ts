import { PAINT_HINT } from "../shared/hints";
import {
  DitherOption,
  InkOption,
  SizeOption,
  StampOption,
} from "../shared/options";
import { defineTool } from "../types";
import { BrushCanvas } from "./canvas";
import { icon } from "./icon";
import { BrushShapeOption } from "./options";

export const brushTool = defineTool({
  id: "brush",
  label: "Brush",
  shortcut: "N",
  icon,
  group: "draw",
  hint: PAINT_HINT,
  size: { key: "brushSize", label: "Brush size" },
  stamp: true,
  tip: (pen) => ({
    size: pen.brushSize,
    shape: pen.brushShape === "line" ? "line" : "round",
    outline: false,
  }),
  options: [StampOption, SizeOption, BrushShapeOption, InkOption, DitherOption],
  canvas: BrushCanvas,
});
