import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";

export function PickSourceOption({ pen, onChange }: ToolOptionProps) {
  return (
    <OptionSelect
      label="Pick from"
      title="Choose which pixels the pipette samples. Also applies to Alt-click."
      value={pen.pickFrom}
      options={[
        ["layer", "Current layer"],
        ["all", "Whole picture"],
      ]}
      onChange={(pickFrom) => onChange({ ...pen, pickFrom })}
    />
  );
}
