import { pointTip } from "../shared/tips";
import { defineTool } from "../types";
import { PipetteCanvas } from "./canvas";
import { icon } from "./icon";

export const pipetteTool = defineTool({
  id: "pipette",
  label: "Pipette",
  shortcut: "I",
  icon,
  group: "pick",
  hint: "Click picks the primary colour · Right-click the secondary",
  anyLayer: true,
  tip: pointTip(true),
  options: [],
  canvas: PipetteCanvas,
});
