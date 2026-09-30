import { cropBitmap, opaqueBox, type Bitmap } from "../bitmap";

/**
 * Cuts the empty space around the subject away, so it fills the tile area
 * when shrunk, however much room the model left around it.
 */
export function cropToContent(image: Bitmap): Bitmap {
  const box = opaqueBox(image);
  return box ? cropBitmap(image, box) : image;
}
