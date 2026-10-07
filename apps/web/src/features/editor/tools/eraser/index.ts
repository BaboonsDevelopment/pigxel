import { DitherOption, SizeOption, StabilizerOption } from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { EraserCanvas } from "./canvas";
import { icon } from "./icon";

export const eraserTool = defineTool({
  id: "eraser",
  label: "Eraser",
  shortcut: "E",
  icon,
  group: "draw",
  hint: "Reveals the background · Shift+click erases a line · Alt+click picks a colour",
  size: { key: "eraserSize" },
  tip: squareTip("eraserSize", true),
  options: [SizeOption, StabilizerOption, DitherOption],
  canvas: EraserCanvas,
});
