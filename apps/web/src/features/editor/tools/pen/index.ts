import { PAINT_HINT } from "../shared/hints";
import {
  DitherOption,
  InkOption,
  PixelPerfectOption,
  SizeOption,
  StabilizerOption,
  StampOption,
} from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { PenCanvas } from "./canvas";
import { icon } from "./icon";

export const penTool = defineTool({
  id: "pen",
  label: "Pen",
  shortcut: "B",
  icon,
  group: "draw",
  hint: PAINT_HINT,
  size: { key: "size" },
  stamp: true,
  tip: squareTip("size"),
  options: [
    StampOption,
    SizeOption,
    PixelPerfectOption,
    StabilizerOption,
    InkOption,
    DitherOption,
  ],
  canvas: PenCanvas,
});
