import { defineTool } from "../types";
import { SliceCanvas } from "./canvas";
import { icon } from "./icon";
import { SliceOption } from "./options";

export const sliceTool = defineTool({
  id: "slice",
  label: "Slice",
  shortcut: "C",
  icon,
  group: "text",
  hint: "Drag to mark a part of the tile · Click a slice to pick it, drag to move it · Del removes it · Export saves each slice as its own PNG",
  anyLayer: true,
  options: [SliceOption],
  canvas: SliceCanvas,
});
