import type { MouseEvent } from "react";
import type { ColorSlot } from "@/components/pixel-canvas/pixel-canvas";
import type { PenSettings } from "@/components/pixel-canvas/pen";

/** The pen with `color` as its primary or secondary colour. */
export const withColor = (pen: PenSettings, color: string, slot: ColorSlot) =>
  slot === "primary" ? { ...pen, color } : { ...pen, secondary: color };

/** A swatch: a click takes it as the primary colour, a right-click as the secondary. */
export function swatchProps(
  color: string,
  pick: (color: string, slot: ColorSlot) => void,
) {
  return {
    title: `${color} · click: primary, right-click: secondary`,
    onClick: () => pick(color, "primary"),
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      pick(color, "secondary");
    },
  };
}
