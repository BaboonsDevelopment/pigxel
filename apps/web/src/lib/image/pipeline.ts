import type { Bitmap, Size } from "./bitmap";
import { cropToContent } from "./steps/crop-to-content";
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
    rule: "Cut out the background (transparent, or magenta with its blended fringe and 1px of outline)",
    apply: cutOutBackground,
  },
  {
    rule: "Crop the empty space around the subject, so it fills the area",
    apply: cropToContent,
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

/**
 * How a redrawn picture becomes tile pixels: the same, but not cropped, as it
 * keeps the framing of the part it replaces.
 */
export const REDRAWN_PICTURE_STEPS: Step[] = GENERATED_PICTURE_STEPS.filter(
  (step) => step.apply !== cropToContent,
);

export const runSteps = (image: Bitmap, target: Size, steps: Step[]) =>
  steps.reduce((current, step) => step.apply(current, target), image);
