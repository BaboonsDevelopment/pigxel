import type { Bitmap, Size } from "./bitmap";
import { hasPurpleMaterial, removeKeyHue } from "./chroma-colours";
import { lineArtKind } from "./line-art";
import { cropToContent } from "./steps/crop-to-content";
import {
  cutOutBackground,
  hasChromaKeyBackdrop,
} from "./steps/cut-out-background";
import { cleanKeySpecks } from "./steps/clean-key-specks";
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
      // Pen drawings have no enlarged pixel grid. Sampling cell centres can
      // erase their strokes before the final resize has a chance to keep them.
      if (lineArtKind(image)) return image;
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

export function runSteps(image: Bitmap, target: Size, steps: Step[]) {
  const keyed =
    steps.some((step) => step.apply === cutOutBackground) &&
    hasChromaKeyBackdrop(image);
  let result = image;
  let purpleMaterial = false;
  for (const step of steps) {
    result = step.apply(result, target);
    if (keyed && step.apply === cutOutBackground)
      purpleMaterial = hasPurpleMaterial(result, target);
  }
  // The delivered tile is the final authority: cropping, grid recovery and
  // palette reduction must not leave a reserved key colour on its edges.
  if (keyed) {
    if (purpleMaterial) cleanKeySpecks(result, target);
    else removeKeyHue(result);
  }
  return result;
}
