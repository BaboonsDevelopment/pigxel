import type { MouseEvent } from "react";
import type { ColorSlot } from "../../pixel-canvas/pen";
import type { PenSettings } from "../../pixel-canvas/pen";

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

export const swatchStyle = (color: string) => ({
  backgroundImage: `linear-gradient(${color}, ${color}), repeating-conic-gradient(#e7e1e4 0 25%, #ffffff 0 50%)`,
  backgroundSize: "100% 100%, 8px 8px",
});
