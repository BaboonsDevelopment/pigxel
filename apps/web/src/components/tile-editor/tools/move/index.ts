import { SelectionActions } from "../shared/options";
import { defineTool } from "../types";
import { MoveCanvas } from "./canvas";
import { icon } from "./icon";
import { MoveTransformOption } from "./options";

export const moveTool = defineTool({
  id: "move",
  label: "Move",
  shortcut: "V",
  icon,
  group: "move",
  hint: "Drag moves the selection, or the whole layer · Handles scale it, the knob turns it (Shift snaps) · Arrow keys nudge · Enter puts it down, Esc cancels",
  selects: true,
  wholeLayer: true,
  cursor: "move",
  options: [SelectionActions, MoveTransformOption],
  canvas: MoveCanvas,
});
