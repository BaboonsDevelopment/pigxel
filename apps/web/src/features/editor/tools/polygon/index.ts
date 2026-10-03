import { DitherOption, InkOption } from "../shared/options";
import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { PolygonCanvas } from "./canvas";
import { icon } from "./icon";

export const polygonTool = defineTool({
  id: "polygon",
  label: "Polygon",
  shortcut: "D",
  shift: true,
  icon,
  group: "shapes",
  hint: "Click to place corners · Click the first one, double-click or Enter fills it · Shift snaps to 45° · Esc cancels · Right button uses the secondary colour",
  tip: pointTip(),
  options: [InkOption, DitherOption],
  canvas: PolygonCanvas,
});
