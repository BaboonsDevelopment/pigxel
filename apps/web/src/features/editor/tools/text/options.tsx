"use client";

import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  isCustomFont,
  LETTER_SPACING,
  LINE_SPACING,
  TEXT_FONTS,
  TEXT_SCALES,
  spacingOf,
  type TextFont,
} from "../../pixel-canvas/text-fonts";
import type { ToolOptionProps } from "../types";
import { NumberOption, OptionSelect } from "../shared/fields";
import { FontsDialog } from "./fonts-dialog";
import { useCustomFonts } from "./fonts";

export function TextOptions({ pen, onChange }: ToolOptionProps) {
  const [managing, setManaging] = useState(false);
  const fonts = useCustomFonts();
  const custom = fonts.data ?? [];
  const missing =
    isCustomFont(pen.textFont) && !custom.some((f) => f.id === pen.textFont);
  return (
    <>
      <OptionSelect<TextFont>
        label="Font"
        title={
          TEXT_FONTS.find((f) => f.id === pen.textFont)?.title ??
          "A font you uploaded"
        }
        value={pen.textFont}
        options={[
          ...TEXT_FONTS.map((f): [TextFont, string] => [f.id, f.label]),
          ...custom.map((f): [TextFont, string] => [
            f.id,
            `${f.name} · ${f.px} px`,
          ]),
          ...(missing
            ? [
                [
                  pen.textFont,
                  fonts.isPending ? "Loading…" : "Missing font",
                ] as [TextFont, string],
              ]
            : []),
        ]}
        onChange={(textFont) => onChange({ ...pen, textFont })}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        title="Upload your own pixel font"
        onClick={() => setManaging(true)}
      >
        Fonts…
      </Button>
      {managing && (
        <FontsDialog
          current={pen.textFont}
          onPick={(textFont) => onChange({ ...pen, textFont })}
          onClose={() => setManaging(false)}
        />
      )}
      <OptionSelect
        label="Size"
        title="How many times bigger than the font's own pixels"
        value={String(pen.textScale)}
        options={TEXT_SCALES.map((n) => [String(n), `${n}×`])}
        onChange={(scale) => onChange({ ...pen, textScale: Number(scale) })}
      />
      <NumberOption
        label="Letter spacing"
        title="Extra pixels between letters, in the font's own pixels"
        value={pen.textLetterSpacing}
        min={LETTER_SPACING.min}
        max={LETTER_SPACING.max}
        unit="px"
        onChange={(letter) =>
          onChange({ ...pen, textLetterSpacing: spacingOf(letter).letter })
        }
      />
      <NumberOption
        label="Line spacing"
        title="Extra pixels between lines, in the font's own pixels"
        value={pen.textLineSpacing}
        min={LINE_SPACING.min}
        max={LINE_SPACING.max}
        unit="px"
        onChange={(line) =>
          onChange({ ...pen, textLineSpacing: spacingOf(0, line).line })
        }
      />
    </>
  );
}
