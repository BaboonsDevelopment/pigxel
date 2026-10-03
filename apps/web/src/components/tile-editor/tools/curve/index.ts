import {
  DitherOption,
  PixelPerfectOption,
  SizeOption,
} from "../shared/options";
import { squareTip } from "../shared/tips";
import { defineTool } from "../types";
import { CurveCanvas } from "./canvas";
import { icon } from "./icon";

export const curveTool = defineTool({
  id: "curve",
  label: "Curve",
  shortcut: "L",
  shift: true,
  icon,
  group: "shapes",
  hint: "Drag the ends, then drag to bend it, then drag again to bend its far end · Enter keeps it as it is · Esc cancels",
  size: { key: "size" },
  tip: squareTip("size"),
  options: [SizeOption, PixelPerfectOption, DitherOption],
  canvas: CurveCanvas,
});
