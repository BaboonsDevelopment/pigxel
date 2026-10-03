import {
  MAX_SPRAY_SPEED,
  MIN_SPRAY_SPEED,
} from "@/components/pixel-canvas/pen";
import type { ToolOptionProps } from "../types";
import { NumberOption } from "../shared/fields";

export function SpraySpeedOption({ pen, onChange }: ToolOptionProps) {
  return (
    <NumberOption
      label="Speed"
      title="How fast dots appear while you hold the button"
      min={MIN_SPRAY_SPEED}
      max={MAX_SPRAY_SPEED}
      value={pen.spraySpeed}
      onChange={(value) =>
        onChange({
          ...pen,
          spraySpeed: Math.max(
            MIN_SPRAY_SPEED,
            Math.min(MAX_SPRAY_SPEED, Math.round(value || MIN_SPRAY_SPEED)),
          ),
        })
      }
    />
  );
}
