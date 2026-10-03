import { defineTool } from "../types";
import { TextCanvas } from "./canvas";
import { icon } from "./icon";
import { TextOptions } from "./options";

export const textTool = defineTool({
  id: "text",
  label: "Text",
  shortcut: "T",
  icon,
  group: "text",
  hint: "Click where the text goes and type · Enter puts it on the tile to move into place · Esc cancels · Right-click uses the secondary colour",
  cursor: "text",
  options: [TextOptions],
  canvas: TextCanvas,
});
