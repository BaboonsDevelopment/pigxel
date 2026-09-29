import { blend, channelBlend } from "./blend";
import { MAX_OPACITY } from "./constants";
import type { BlendMode, Layer, LayerKind, PixelsOf } from "./types";

/**
 * Paints `src` over `dst` (both RGBA of the same size) in place, faded by
 * `opacity` (0–255) and mixed in `mode`, following the W3C source-over rule.
 */
export function compositeOver(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  opacity: number,
  mode: BlendMode,
) {
  const fade = opacity / MAX_OPACITY;
  // Runs for every pixel of every layer on each repaint, so it avoids
  // allocating: separable modes go channel by channel.
  const channel = channelBlend(mode);
  const mixed = [0, 0, 0];
  for (let i = 0; i < dst.length; i += 4) {
    const as = (src[i + 3]! / 255) * fade;
    if (as === 0) continue;
    const ab = dst[i + 3]! / 255;
    if (ab === 0 || mode === "normal") {
      // Where nothing is below, the layer shows as it is.
      mixed[0] = src[i]! / 255;
      mixed[1] = src[i + 1]! / 255;
      mixed[2] = src[i + 2]! / 255;
    } else if (channel) {
      for (let c = 0; c < 3; c++)
        mixed[c] = channel(dst[i + c]! / 255, src[i + c]! / 255);
    } else {
      const [r, g, b] = blend(
        mode,
        [dst[i]! / 255, dst[i + 1]! / 255, dst[i + 2]! / 255],
        [src[i]! / 255, src[i + 1]! / 255, src[i + 2]! / 255],
      );
      mixed[0] = r;
      mixed[1] = g;
      mixed[2] = b;
    }
    const ao = as + ab * (1 - as);
    for (let c = 0; c < 3; c++) {
      const cs = src[i + c]! / 255;
      const cb = dst[i + c]! / 255;
      const top = (1 - ab) * cs + ab * mixed[c]!;
      dst[i + c] = Math.round(((as * top + ab * cb * (1 - as)) / ao) * 255);
    }
    dst[i + 3] = Math.round(ao * 255);
  }
}

/**
 * The picture the layers make together: every shown layer painted bottom to
 * top with its opacity and blend mode. A group first combines its own layers,
 * then goes over what is below as one picture, as in Aseprite. Layers of the
 * `skip` kinds are left out, e.g. references when exporting.
 */
export function flatten(
  tree: Layer[],
  pixelsOf: PixelsOf,
  length: number,
  skip: LayerKind[] = [],
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(length);
  for (const layer of tree) {
    if (!layer.visible || skip.includes(layer.kind)) continue;
    const pixels =
      layer.kind === "group"
        ? flatten(layer.children, pixelsOf, length, skip)
        : pixelsOf(layer.id);
    if (pixels) compositeOver(out, pixels, layer.opacity, layer.blend);
  }
  return out;
}
