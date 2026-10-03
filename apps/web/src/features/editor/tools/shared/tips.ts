import {
  brushTip,
  lineTip,
  type PenSettings,
  type TipRect,
} from "../../pixel-canvas/pen";
import type { SizeKey, ToolTip } from "../types";

export const squareTip =
  (key: SizeKey, outline = false) =>
  (pen: PenSettings): ToolTip => ({ size: pen[key], shape: "square", outline });

export const roundTip =
  (key: SizeKey, outline = false) =>
  (pen: PenSettings): ToolTip => ({ size: pen[key], shape: "round", outline });

export const pointTip =
  (outline = false) =>
  (): ToolTip => ({ size: 1, shape: "square", outline });

export const tipRects = (tip: ToolTip | null, angle: number): TipRect[] =>
  !tip
    ? []
    : tip.shape === "line"
      ? lineTip(tip.size, angle)
      : brushTip(tip.size, tip.shape === "round");
