import type { MouseEvent } from "react";
import type { ColorSlot } from "@/components/pixel-canvas/pen";
import type { PenSettings } from "@/components/pixel-canvas/pen";

export const withColor = (pen: PenSettings, color: string, slot: ColorSlot) =>
  slot === "primary" ? { ...pen, color } : { ...pen, secondary: color };

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
