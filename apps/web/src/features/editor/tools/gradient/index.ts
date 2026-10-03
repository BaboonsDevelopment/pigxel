import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { GradientCanvas } from "./canvas";
import { icon } from "./icon";
import { GradientOptions } from "./options";

export const gradientTool = defineTool({
  id: "gradient",
  label: "Gradient",
  shortcut: "G",
  shift: true,
  icon,
  group: "fill",
  hint: "Drag from the primary colour to the secondary · Fills the selection, or the whole layer · Shift snaps to 45° · Right button swaps the colours",
  tip: pointTip(),
  options: [GradientOptions],
  canvas: GradientCanvas,
});
