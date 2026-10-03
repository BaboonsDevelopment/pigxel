import { TEXT_FONTS, TEXT_SCALES } from "../../pixel-canvas/text-fonts";
import type { ToolOptionProps } from "../types";
import { OptionSelect } from "../shared/fields";

export function TextOptions({ pen, onChange }: ToolOptionProps) {
  return (
    <>
      <OptionSelect
        label="Font"
        title={TEXT_FONTS.find((f) => f.id === pen.textFont)?.title ?? ""}
        value={pen.textFont}
        options={TEXT_FONTS.map((f) => [f.id, f.label])}
        onChange={(textFont) => onChange({ ...pen, textFont })}
      />
      <OptionSelect
        label="Size"
        title="How many times bigger than the font's own pixels"
        value={String(pen.textScale)}
        options={TEXT_SCALES.map((n) => [String(n), `${n}×`])}
        onChange={(scale) => onChange({ ...pen, textScale: Number(scale) })}
      />
    </>
  );
}
