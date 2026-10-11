export type BuiltInFont =
  "tiny5" | "dotGothic" | "pressStart" | "silkscreen" | "tiny";

export type CustomFont = `custom:${string}`;

export type TextFont = BuiltInFont | CustomFont;

const CUSTOM_FONT = /^custom:[0-9a-f-]{36}$/;

export const isCustomFont = (font: unknown): font is CustomFont =>
  typeof font === "string" && CUSTOM_FONT.test(font);

export const customFontId = (id: string): CustomFont => `custom:${id}`;

export const TEXT_FONTS: { id: BuiltInFont; label: string; title: string }[] = [
  {
    id: "tiny5",
    label: "Tiny5 · 5 px",
    title: "Small letters and capitals, Latin and Cyrillic: for 16–32 px tiles",
  },
  {
    id: "dotGothic",
    label: "DotGothic16 · 13 px",
    title: "Large and clear, Latin and Cyrillic: for 32 px tiles and up",
  },
  {
    id: "pressStart",
    label: "Press Start 2P · 7 px",
    title: "Bold arcade capitals, Latin and Cyrillic",
  },
  {
    id: "silkscreen",
    label: "Silkscreen · 5 px",
    title: "Capitals only, Latin letters",
  },
  {
    id: "tiny",
    label: "Tiny 3×5",
    title:
      "The smallest: capital letters, digits and signs in 3 × 5 pixels, Latin only",
  },
];

export const TEXT_SCALES = [1, 2, 3];

export const LETTER_SPACING = { min: -1, max: 8 };
export const LINE_SPACING = { min: -2, max: 16 };

export type TextSpacing = { letter: number; line: number };

export const spacingOf = (letter = 0, line = 0): TextSpacing => ({
  letter: Number.isInteger(letter)
    ? Math.min(LETTER_SPACING.max, Math.max(LETTER_SPACING.min, letter))
    : 0,
  line: Number.isInteger(line)
    ? Math.min(LINE_SPACING.max, Math.max(LINE_SPACING.min, line))
    : 0,
});
