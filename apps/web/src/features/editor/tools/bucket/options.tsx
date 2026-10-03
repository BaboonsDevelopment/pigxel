import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";

export function FillFromOption({ pen, onChange }: ToolOptionProps) {
  return (
    <OptionSelect
      label="Edges from"
      title="All layers: lines on other layers stop the fill too, while it still paints only the active layer. For colouring under an outline layer"
      value={pen.fillFrom}
      options={[
        ["layer", "This layer"],
        ["all", "All layers"],
      ]}
      onChange={(fillFrom) => onChange({ ...pen, fillFrom })}
    />
  );
}
