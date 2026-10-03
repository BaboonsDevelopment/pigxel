import type { ToolOptionProps } from "../types";
import { NumberOption, OptionSelect } from "../shared/fields";

export function BrushShapeOption({ pen, onChange, stamp }: ToolOptionProps) {
  if (stamp) return null;
  return (
    <>
      <OptionSelect
        label="Shape"
        title="Line: a calligraphy pen, wide when drawn across its slant and thin along it"
        value={pen.brushShape}
        options={[
          ["round", "Round"],
          ["line", "Line"],
        ]}
        onChange={(brushShape) => onChange({ ...pen, brushShape })}
      />
      {pen.brushShape === "line" && (
        <NumberOption
          label="Angle"
          title="The line's slant in degrees: 0 lies flat, 45 leans right, 90 stands up, 135 leans left"
          min={0}
          max={180}
          step={15}
          unit="°"
          value={pen.brushAngle}
          onChange={(value) =>
            onChange({
              ...pen,
              brushAngle: Math.max(0, Math.min(180, Math.round(value) || 0)),
            })
          }
        />
      )}
    </>
  );
}
