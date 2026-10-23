import {
  colorDistance,
  copyBitmap,
  rgbAt,
  type Bitmap,
  type Size,
} from "../bitmap";
import { CHROMA_KEY, CHROMA_KEY_TOLERANCE } from "../constants";
import { cleanKeySpecks } from "./clean-key-specks";

// Near the silhouette the generated key is often slightly darker/redder than
// #ff00ff. Widen only the low-green key range, not the whole purple colour range.
const KEY_EDGE_TOLERANCE = 120;
const KEY_EDGE_MAX_GREEN = 32;

export function hasChromaKeyBackdrop(source: Bitmap): boolean {
  let edge = 0,
    keyedEdge = 0;
  const check = (i: number) => {
    edge++;
    if (
      source.rgba[i * 4 + 3]! >= 128 &&
      colorDistance(rgbAt(source, i), CHROMA_KEY) <= CHROMA_KEY_TOLERANCE
    )
      keyedEdge++;
  };
  for (let x = 0; x < source.w; x++) {
    check(x);
    if (source.h > 1) check((source.h - 1) * source.w + x);
  }
  for (let y = 1; y < source.h - 1; y++) {
    check(y * source.w);
    if (source.w > 1) check((y + 1) * source.w - 1);
  }
  return edge > 0 && keyedEdge >= edge * 0.25;
}

/** Once the perimeter confirms an opaque chroma-key backdrop, its reserved
 * colour is background in enclosed silhouette gaps too. Native-alpha artwork
 * and scenes must not be treated as a global purple colour-key mask. */
export function cutOutBackground(
  source: Bitmap,
  target: Size = { w: 64, h: 64 },
): Bitmap {
  const image = copyBitmap(source);
  // A few pink pixels in a native-alpha sprite are not evidence of a backdrop.
  if (!hasChromaKeyBackdrop(source)) return image;
  const count = image.w * image.h;
  const seen = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let tail = 0;
  const add = (i: number) => {
    if (seen[i]) return;
    if (source.rgba[i * 4 + 3]) {
      const colour = rgbAt(source, i);
      const distance = colorDistance(colour, CHROMA_KEY);
      if (
        distance > CHROMA_KEY_TOLERANCE &&
        (distance > KEY_EDGE_TOLERANCE || colour.g > KEY_EDGE_MAX_GREEN)
      )
        return;
    }
    seen[i] = 1;
    queue[tail++] = i;
  };
  // The generator reserves this narrow key band for the backdrop. Seeding only
  // the perimeter misses holes between arms/legs and can contaminate the final
  // palette with key colours even when the outer background looks transparent.
  for (let i = 0; i < count; i++) {
    if (
      source.rgba[i * 4 + 3] &&
      colorDistance(rgbAt(source, i), CHROMA_KEY) <= CHROMA_KEY_TOLERANCE
    )
      add(i);
  }
  for (let head = 0; head < tail; head++) {
    const i = queue[head]!,
      x = i % image.w,
      y = Math.floor(i / image.w);
    image.rgba.fill(0, i * 4, i * 4 + 4);
    // A diagonal opening is still outside space. Four-way flooding leaves
    // key-coloured specks trapped between staircase-shaped pixel edges.
    for (let dy = -1; dy <= 1; dy++) {
      if (y + dy < 0 || y + dy >= image.h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= image.w) continue;
        add(i + dy * image.w + dx);
      }
    }
  }
  cleanKeySpecks(image, target);
  return image;
}
