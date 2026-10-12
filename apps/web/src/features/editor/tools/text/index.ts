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
  hint: "Click to add text on the current layer, or click existing text to edit · Enter adds a line · Ctrl/⌘ + Enter applies · Esc cancels · Right-click uses the secondary colour",
  anyLayer: true,
  cursor: "text",
  options: [TextOptions],
  canvas: TextCanvas,
});
