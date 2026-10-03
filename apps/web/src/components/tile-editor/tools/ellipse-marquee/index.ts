import { SELECT_HINT } from "../shared/hints";
import { SelectionActions } from "../shared/options";
import { defineTool } from "../types";
import { EllipseMarqueeCanvas } from "./canvas";
import { icon } from "./icon";

export const ellipseMarqueeTool = defineTool({
  id: "ellipseMarquee",
  label: "Elliptical selection",
  shortcut: "M",
  shift: true,
  icon,
  group: "select",
  hint: `Shift while dragging makes a circle · ${SELECT_HINT}`,
  selects: true,
  cursor: "selection",
  anyLayer: true,
  options: [SelectionActions],
  canvas: EllipseMarqueeCanvas,
});
