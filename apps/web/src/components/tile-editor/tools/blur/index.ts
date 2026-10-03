import { DitherOption, SizeOption } from "../shared/options";
import { roundTip } from "../shared/tips";
import { defineTool } from "../types";
import { BlurCanvas } from "./canvas";
import { icon } from "./icon";

export const blurTool = defineTool({
  id: "blur",
  label: "Blur",
  shortcut: "R",
  icon,
  group: "effects",
  hint: "Drag over an edge to soften it; it adds in-between colours · Each stroke blurs once more",
  size: { key: "brushSize" },
  tip: roundTip("brushSize", true),
  options: [SizeOption, DitherOption],
  canvas: BlurCanvas,
});
