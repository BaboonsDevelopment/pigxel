import { SELECT_HINT } from "../shared/hints";
import { SelectionActions } from "../shared/options";
import { defineTool } from "../types";
import { MarqueeCanvas } from "./canvas";
import { icon } from "./icon";

export const marqueeTool = defineTool({
  id: "marquee",
  label: "Rectangle selection",
  shortcut: "M",
  icon,
  group: "select",
  hint: SELECT_HINT,
  selects: true,
  cursor: "selection",
  anyLayer: true,
  options: [SelectionActions],
  canvas: MarqueeCanvas,
});
