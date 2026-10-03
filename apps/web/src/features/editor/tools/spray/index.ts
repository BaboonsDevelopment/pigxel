import { DitherOption, InkOption, SizeOption } from "../shared/options";
import { defineTool } from "../types";
import { SprayCanvas } from "./canvas";
import { icon } from "./icon";
import { SpraySpeedOption } from "./options";

export const sprayTool = defineTool({
  id: "spray",
  label: "Spray",
  shortcut: "S",
  shift: true,
  icon,
  group: "draw",
  hint: "Hold to scatter dots; the longer you hold, the denser · Right button sprays the secondary colour · Alt+click picks a colour",
  size: { key: "sprayWidth", label: "Width" },
  tip: (pen) => ({
    size: pen.sprayWidth * 2 + 1,
    shape: "round",
    outline: true,
  }),
  options: [SizeOption, SpraySpeedOption, InkOption, DitherOption],
  canvas: SprayCanvas,
});
