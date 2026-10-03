import { Geist, Geist_Pixel } from "next/font/google";

export const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export const geistPixel = Geist_Pixel({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-geist-pixel",
});
