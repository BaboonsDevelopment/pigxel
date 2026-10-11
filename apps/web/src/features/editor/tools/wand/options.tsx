import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";

export function WandFromOption({ pen, onChange }: ToolOptionProps) {
  return (
    <OptionSelect
      label="Colours from"
      title="All layers: picks the colour area as you see it, from every visible layer. The selection still works on the active layer"
      value={pen.wandFrom}
      options={[
        ["layer", "This layer"],
        ["all", "All layers"],
      ]}
      onChange={(wandFrom) => onChange({ ...pen, wandFrom })}
    />
  );
}
