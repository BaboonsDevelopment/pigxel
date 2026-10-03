import { cropBitmap, opaqueBox, type Bitmap } from "../bitmap";

export function cropToContent(image: Bitmap): Bitmap {
  const box = opaqueBox(image);
  return box ? cropBitmap(image, box) : image;
}
