import { DitherOption, SizeOption } from "../shared/options";
import { roundTip } from "../shared/tips";
import { defineTool } from "../types";
import { JumbleCanvas } from "./canvas";
import { icon } from "./icon";

export const jumbleTool = defineTool({
  id: "jumble",
  label: "Jumble",
  shortcut: "R",
  shift: true,
  icon,
  group: "effects",
  hint: "Drag over an edge to make it ragged; no new colours · Each stroke jumbles more",
  size: { key: "brushSize" },
  tip: roundTip("brushSize", true),
  options: [SizeOption, DitherOption],
  canvas: JumbleCanvas,
});
