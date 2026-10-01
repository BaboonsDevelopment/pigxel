import type { Bitmap, Size } from "./bitmap";
import { cutOutBackground } from "./steps/cut-out-background";
import { recoverPixelGrid } from "./steps/recover-pixel-grid";
import { removeStrayPixels } from "./steps/remove-stray-pixels";
import { shrinkToTile } from "./steps/shrink-to-tile";

/** One rule of turning a picture into tile pixels. Settings live in constants.ts. */
export type Step = {
  rule: string;
  apply: (image: Bitmap, target: Size) => Bitmap;
};

/** How a picture from the image model becomes tile pixels, in order. */
export const GENERATED_PICTURE_STEPS: Step[] = [
  {
    rule: "Cut out the magenta background, its blended fringe and 1px of outline",
    apply: cutOutBackground,
  },
  {
    rule: "Recover the model's own pixel grid, one colour per cell",
    apply: recoverPixelGrid,
  },
  {
    rule: "Shrink to the tile area with a palette sized to it",
    apply: shrinkToTile,
  },
  {
    rule: "Remove lone specks and pixels unlike all their neighbours",
    apply: removeStrayPixels,
  },
];

export const runSteps = (image: Bitmap, target: Size, steps: Step[]) =>
  steps.reduce((current, step) => step.apply(current, target), image);
