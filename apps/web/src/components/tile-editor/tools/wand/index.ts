import {
  ContiguousOption,
  SelectionActions,
  ToleranceOption,
} from "../shared/options";
import { defineTool } from "../types";
import { WandCanvas } from "./canvas";
import { icon } from "./icon";

export const wandTool = defineTool({
  id: "wand",
  label: "Magic wand",
  shortcut: "W",
  icon,
  group: "select",
  hint: "Click selects a colour area · Shift adds · Alt takes away",
  selects: true,
  anyLayer: true,
  options: [ContiguousOption, ToleranceOption, SelectionActions],
  canvas: WandCanvas,
});
