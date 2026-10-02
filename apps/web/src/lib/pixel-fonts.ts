import {
  DotGothic16,
  Press_Start_2P,
  Silkscreen,
  Tiny5,
} from "next/font/google";

/** Pixel fonts for the editor's text tool. */
export const tiny5 = Tiny5({
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

export const dotGothic16 = DotGothic16({
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

export const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: "400",
});

export const pressStart2P = Press_Start_2P({
  subsets: ["latin", "cyrillic"],
  weight: "400",
});
