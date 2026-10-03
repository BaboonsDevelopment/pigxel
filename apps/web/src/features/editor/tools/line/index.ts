import { DitherOption, SizeOption } from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { LineCanvas } from "./canvas";
import { icon } from "./icon";

export const lineTool = defineTool({
  id: "line",
  label: "Line",
  shortcut: "L",
  icon,
  group: "shapes",
  hint: "Drag to draw · Shift snaps to 45° · Right button uses the secondary colour",
  size: { key: "size" },
  tip: squareTip("size"),
  options: [SizeOption, DitherOption],
  canvas: LineCanvas,
});
