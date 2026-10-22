import type { Bitmap, Size } from "./bitmap";
import { cropToContent } from "./steps/crop-to-content";
import { cutOutBackground } from "./steps/cut-out-background";
import { recoverPixelGrid } from "./steps/recover-pixel-grid";
import { shrinkToTile } from "./steps/shrink-to-tile";

export type Step = {
  rule: string;
  apply: (image: Bitmap, target: Size) => Bitmap;
};

export const GENERATED_PICTURE_STEPS: Step[] = [
  {
    rule: "Cut out the magenta background without eroding the subject outline",
    apply: cutOutBackground,
  },
  {
    rule: "Crop the empty space around the subject, so it fills the area",
    apply: cropToContent,
  },
  {
    rule: "Recover the model's own pixel grid, one colour per cell",
    apply: (image, target) => {
      const recovered = recoverPixelGrid(image);
      return recovered.w < target.w || recovered.h < target.h
        ? image
        : recovered;
    },
  },
  {
    rule: "Shrink to the tile area with a palette sized to it",
    apply: shrinkToTile,
  },
];

// Editing uses the exact reference canvas; grid inference must not reframe it.
export const REDRAWN_PICTURE_STEPS: Step[] = [
  GENERATED_PICTURE_STEPS[0]!,
  { rule: "Keep the reference canvas and details", apply: shrinkToTile },
];

export const SCENE_PICTURE_STEPS: Step[] = [
  {
    rule: "Preserve the complete composition and its painted background",
    apply: (image, target) => shrinkToTile(image, target, "stretch"),
  },
];

export const runSteps = (image: Bitmap, target: Size, steps: Step[]) =>
  steps.reduce((current, step) => step.apply(current, target), image);
