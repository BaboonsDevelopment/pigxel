import { blend, channelBlend } from "./blend";
import { MAX_OPACITY } from "./constants";
import type { BlendMode, Layer, LayerKind, PixelsOf } from "./types";
import type { CelSetting } from "@/lib/sprite/cel-settings";

export function orderedLayers(
  tree: Layer[],
  appearance: (id: string) => CelSetting | undefined,
): Layer[] {
  return tree
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => {
      if (a.layer.kind === "background") return -1;
      if (b.layer.kind === "background") return 1;
      const above = Number(!!a.layer.above) - Number(!!b.layer.above);
      if (above) return above;
      return (
        (appearance(a.layer.id)?.zIndex ?? a.index) -
          (appearance(b.layer.id)?.zIndex ?? b.index) || a.index - b.index
      );
    })
    .map(({ layer }) => layer);
}

export function compositeOver(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  opacity: number,
  mode: BlendMode,
) {
  const fade = opacity / MAX_OPACITY;
  const channel = channelBlend(mode);
  const mixed = [0, 0, 0];
  for (let i = 0; i < dst.length; i += 4) {
    const as = (src[i + 3]! / 255) * fade;
    if (as === 0) continue;
    const ab = dst[i + 3]! / 255;
    if (ab === 0 || mode === "normal") {
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

export function masked(
  pixels: Uint8ClampedArray,
  mask: Uint8ClampedArray,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 0; i < out.length; i += 4) {
    const a = mask[i + 3]!;
    if (!a || !out[i + 3]) continue;
    const light =
      (0.299 * mask[i]! + 0.587 * mask[i + 1]! + 0.114 * mask[i + 2]!) / 255;
    out[i + 3] = Math.round(out[i + 3]! * (1 - (a / 255) * (1 - light)));
  }
  return out;
}

export function clipped(
  pixels: Uint8ClampedArray,
  base: Uint8ClampedArray,
  fade: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(pixels);
  for (let i = 3; i < out.length; i += 4)
    out[i] = Math.round((out[i]! * base[i]! * fade) / 255);
  return out;
}

export function flatten(
  tree: Layer[],
  pixelsOf: PixelsOf,
  length: number,
  skip: LayerKind[] = [],
  appearance: (id: string) => CelSetting | undefined = () => undefined,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(length);
  const ordered = orderedLayers(tree, appearance);
  let base: { pixels: Uint8ClampedArray | undefined; fade: number } | null =
    null;
  ordered.forEach((layer, index) => {
    if (layer.mask && layer.kind === "normal") return;
    const clipping = layer.clip && !!base;
    const fade =
      (layer.kind === "group"
        ? layer.opacity
        : (layer.opacity * (appearance(layer.id)?.opacity ?? MAX_OPACITY)) /
          MAX_OPACITY) / MAX_OPACITY;
    if (!layer.visible || skip.includes(layer.kind)) {
      if (!clipping) base = { pixels: undefined, fade: 0 };
      return;
    }
    let pixels =
      layer.kind === "group"
        ? flatten(layer.children, pixelsOf, length, skip, appearance)
        : pixelsOf(layer.id);
    for (let at = index + 1; pixels; at++) {
      const mask = ordered[at];
      if (!mask?.mask || mask.kind !== "normal") break;
      const maskPixels = mask.visible && pixelsOf(mask.id);
      if (maskPixels) pixels = masked(pixels, maskPixels);
    }
    if (clipping && base) {
      if (!pixels || !base.pixels || !base.fade) return;
      pixels = clipped(pixels, base.pixels, base.fade);
    } else base = { pixels, fade };
    if (pixels) compositeOver(out, pixels, fade * MAX_OPACITY, layer.blend);
  });
  return out;
}
