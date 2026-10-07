import {
  CornerRadiusOption,
  DitherOption,
  FilledOption,
  SizeOption,
} from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { RectCanvas } from "./canvas";
import { icon } from "./icon";

export const rectTool = defineTool({
  id: "rect",
  label: "Rectangle",
  shortcut: "U",
  icon,
  group: "shapes",
  hint: "Drag to draw · Shift makes a square · Right button uses the secondary colour",
  size: { key: "size" },
  tip: squareTip("size"),
  options: [SizeOption, CornerRadiusOption, DitherOption, FilledOption],
  canvas: RectCanvas,
});
