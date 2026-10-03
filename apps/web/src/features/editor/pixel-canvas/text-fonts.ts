export type TextFont =
  "tiny5" | "dotGothic" | "pressStart" | "silkscreen" | "tiny";

export const TEXT_FONTS: { id: TextFont; label: string; title: string }[] = [
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
