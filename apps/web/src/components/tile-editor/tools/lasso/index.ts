import { SELECT_HINT } from "../shared/hints";
import { SelectionActions } from "../shared/options";
import { defineTool } from "../types";
import { LassoCanvas } from "./canvas";
import { icon } from "./icon";

export const lassoTool = defineTool({
  id: "lasso",
  label: "Lasso",
  shortcut: "Q",
  icon,
  group: "select",
  hint: `Draw around the pixels · ${SELECT_HINT}`,
  selects: true,
  cursor: "selection",
  anyLayer: true,
  options: [SelectionActions],
  canvas: LassoCanvas,
});
