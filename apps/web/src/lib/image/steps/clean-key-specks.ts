import { rgbAt, type Bitmap, type Size } from "../bitmap";
import { hasPurpleMaterial, isKeyHue, removeKeyHue } from "../chroma-colours";

/** Clean key-colour contamination along transparent contours, including holes.
 * A dark edge blended with magenta has the same hue at much lower brightness.
 * Runs after a key backdrop was confirmed; broad purple material and enclosed
 * paint details are not specks, even if they have the same hue. */
export function cleanKeySpecks(image: Bitmap, target: Size) {
  // When the artwork has no purple material, the entire reserved key hue is
  // unwanted. Remove it everywhere, including clipped canvas-edge pixels and
  // isolated remnants that cannot be reached by a transparency flood fill.
  if (!hasPurpleMaterial(image, target)) {
    removeKeyHue(image);
    return;
  }
  const count = image.w * image.h;
  const transparent = new Uint8Array(count);
  const visited = new Uint8Array(count);
  const queue = new Uint32Array(count);
  let tail = 0;
  const around = (i: number, visit: (n: number) => void) => {
    const x = i % image.w,
      y = Math.floor(i / image.w);
    for (let dy = -1; dy <= 1; dy++) {
      if (y + dy < 0 || y + dy >= image.h) continue;
      for (let dx = -1; dx <= 1; dx++)
        if ((dx || dy) && x + dx >= 0 && x + dx < image.w)
          visit(i + dy * image.w + dx);
    }
  };
  // Keep a fixed mask so cleaning one component cannot expose and erode another.
  for (let i = 0; i < count; i++)
    if (!image.rgba[i * 4 + 3]) transparent[i] = 1;

  const isSpeckColour = (i: number) => {
    if (!image.rgba[i * 4 + 3]) return false;
    return isKeyHue(rgbAt(image, i));
  };
  // A tiny speck may cover one output pixel. A longer fringe is removable only
  // when every pixel is within one output pixel of transparency. Evaluate the
  // original mask once, so cleanup cannot progressively eat into purple paint.
  const maxArea = Math.max(1, Math.floor(count / (target.w * target.h)));
  const stepX = Math.max(1, Math.ceil(image.w / target.w));
  const stepY = Math.max(1, Math.ceil(image.h / target.h));
  const nearTransparency = (i: number) => {
    const x = i % image.w,
      y = Math.floor(i / image.w);
    for (let dy = -stepY; dy <= stepY; dy += stepY)
      for (let dx = -stepX; dx <= stepX; dx += stepX) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= image.w || ny >= image.h) return true;
        if (transparent[ny * image.w + nx]) return true;
      }
    return false;
  };
  for (let i = 0; i < count; i++) {
    if (visited[i] || !isSpeckColour(i)) continue;
    tail = 0;
    let touchesTransparency = false;
    let boundaryOnly = true;
    let purpleMaterial = false;
    const add = (n: number) => {
      if (transparent[n]) touchesTransparency = true;
      if (!isSpeckColour(n)) {
        if (image.rgba[n * 4 + 3]) {
          const colour = rgbAt(image, n);
          // Blue-violet material adjoining a magenta highlight is evidence of
          // actual purple paint, unlike spill against neutral stone/metal.
          if (
            colour.r - colour.g >= 16 &&
            colour.b - colour.r >= 20 &&
            colour.b - colour.g >= 32
          )
            purpleMaterial = true;
        }
        return;
      }
      if (visited[n]) return;
      visited[n] = 1;
      queue[tail++] = n;
    };
    add(i);
    for (let head = 0; head < tail; head++) {
      const p = queue[head]!;
      const x = p % image.w,
        y = Math.floor(p / image.w);
      if (x === 0 || y === 0 || x === image.w - 1 || y === image.h - 1)
        touchesTransparency = true;
      if (!nearTransparency(p)) boundaryOnly = false;
      around(p, add);
    }
    if (
      !purpleMaterial &&
      touchesTransparency &&
      (tail <= maxArea || boundaryOnly)
    )
      for (let n = 0; n < tail; n++) {
        const p = queue[n]! * 4;
        image.rgba.fill(0, p, p + 4);
      }
  }
}
