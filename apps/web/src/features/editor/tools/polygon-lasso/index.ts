import { SelectionActions } from "../shared/options";
import { defineTool } from "../types";
import { PolygonLassoCanvas } from "./canvas";
import { icon } from "./icon";

export const polygonLassoTool = defineTool({
  id: "polygonLasso",
  label: "Polygonal lasso",
  shortcut: "Q",
  shift: true,
  icon,
  group: "select",
  hint: "Click to place corners · Click the first one, double-click or Enter closes · Esc cancels · Shift adds · Alt takes away",
  selects: true,
  cursor: "selection",
  anyLayer: true,
  options: [SelectionActions],
  canvas: PolygonLassoCanvas,
});
