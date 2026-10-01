import { Geist, Geist_Pixel } from "next/font/google";

/** The site's marketing type (landing, public header): Geist for words, Geist Pixel for numbers and labels. */
export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const geistPixel = Geist_Pixel({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-geist-pixel",
});
