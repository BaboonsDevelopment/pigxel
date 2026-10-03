import { DitherOption, InkOption } from "../shared/options";
import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { ContourCanvas } from "./canvas";
import { icon } from "./icon";

export const contourTool = defineTool({
  id: "contour",
  label: "Contour",
  shortcut: "D",
  icon,
  group: "shapes",
  hint: "Draw around a shape; it closes and fills as you go · Right button fills with the secondary colour · Alt+click picks a colour",
  tip: pointTip(),
  options: [InkOption, DitherOption],
  canvas: ContourCanvas,
});
