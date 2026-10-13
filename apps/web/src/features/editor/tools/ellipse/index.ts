import { DitherOption, FilledOption, SizeOption } from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { EllipseCanvas } from "./canvas";
import { icon } from "./icon";

export const ellipseTool = defineTool({
  id: "ellipse",
  label: "Ellipse",
  shortcut: "U",
  shift: true,
  icon,
  group: "shapes",
  hint: "Drag to draw · Alt draws from the centre · Shift makes a circle · Right button uses the secondary colour",
  altFromCenter: true,
  size: { key: "size" },
  tip: squareTip("size"),
  options: [SizeOption, DitherOption, FilledOption],
  canvas: EllipseCanvas,
});
