import type { ToolOptionProps } from "../types";
import { CheckboxField } from "@pigxel/ui/components/choice";
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

export function TextureOption({ pen, onChange, stamp }: ToolOptionProps) {
  if (!stamp) return null;
  return (
    <CheckboxField
      label="Fill with brush pattern"
      title="Fills with the picture brush repeated as a texture instead of a colour"
      checked={pen.stampPattern}
      onChange={(e) => onChange({ ...pen, stampPattern: e.target.checked })}
    />
  );
}
