import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";

export function GradientOptions({ pen, onChange }: ToolOptionProps) {
  return (
    <>
      <OptionSelect
        label="Shape"
        title="Linear runs along the line; radial spreads out from where you start"
        value={pen.gradientShape}
        options={[
          ["linear", "Linear"],
          ["radial", "Radial"],
        ]}
        onChange={(gradientShape) => onChange({ ...pen, gradientShape })}
      />
      <OptionSelect
        label="Dither"
        title="A dither keeps to the two colours; Smooth mixes them into new shades"
        value={pen.gradientDither}
        options={[
          ["bayer4", "Ordered 4×4"],
          ["bayer8", "Ordered 8×8"],
          ["none", "Smooth"],
        ]}
        onChange={(gradientDither) => onChange({ ...pen, gradientDither })}
      />
    </>
  );
}
