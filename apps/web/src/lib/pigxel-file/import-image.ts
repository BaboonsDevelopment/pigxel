import { decodeGif, type DecodedAnimation } from "@/lib/image/gif-decode";
import { colorsOf } from "@/lib/palette/presets";
import { clampDuration, createFrame } from "@/lib/sprite/frames";
import {
  MAX_PIGXEL_SIZE,
  PigxelFileError,
  blankDocument,
  type PigxelDocument,
} from "./format";

export const IMAGE_FILE_TYPES =
  ".png,.gif,.jpg,.jpeg,.webp,.bmp,image/png,image/gif,image/jpeg,image/webp,image/bmp";

const IMAGE_EXTENSION = /\.(png|gif|jpe?g|webp|bmp)$/i;

export function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXTENSION.test(file.name);
}

export function imageBaseName(name: string) {
  return name.replace(IMAGE_EXTENSION, "") || "Untitled";
}

export function pixelScale(anim: DecodedAnimation): number {
  const { w, h, frames } = anim;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const divisors = [];
  for (let k = gcd(w, h); k >= 2; k--)
    if (w % k === 0 && h % k === 0) divisors.push(k);
  const blocky = (k: number) =>
    frames.every(({ rgba }) => {
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const at = (y * w + x) * 4;
          const corner = ((y - (y % k)) * w + (x - (x % k))) * 4;
          for (let c = 0; c < 4; c++)
            if (rgba[at + c] !== rgba[corner + c]) return false;
        }
      return true;
    });
  return divisors.find(blocky) ?? 1;
}

export function unscaled(anim: DecodedAnimation, k: number): DecodedAnimation {
  if (k === 1) return anim;
  const w = anim.w / k;
  const h = anim.h / k;
  return {
    w,
    h,
    frames: anim.frames.map(({ rgba, duration }) => {
      const out = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          out.set(
            rgba.subarray(
              (y * k * anim.w + x * k) * 4,
              (y * k * anim.w + x * k) * 4 + 4,
            ),
            (y * w + x) * 4,
          );
      return { rgba: out, duration };
    }),
  };
}

const PIXEL_ART_COLORS = 256;

export function looksLikePixelArt(rgba: Uint8ClampedArray) {
  const colors = new Set<number>();
  const view = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.length / 4);
  for (const color of view) {
    colors.add(color);
    if (colors.size > PIXEL_ART_COLORS) return false;
  }
  return true;
}

function sharpDownscale(
  rgba: Uint8ClampedArray,
  from: { w: number; h: number },
  w: number,
  h: number,
): Uint8ClampedArray {
  const source = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.length / 4);
  const out = new Uint32Array(w * h);
  const counts = new Map<number, number>();
  for (let y = 0; y < h; y++) {
    const top = Math.floor((y * from.h) / h);
    const bottom = Math.max(top + 1, Math.floor(((y + 1) * from.h) / h));
    for (let x = 0; x < w; x++) {
      const left = Math.floor((x * from.w) / w);
      const right = Math.max(left + 1, Math.floor(((x + 1) * from.w) / w));
      counts.clear();
      let best = source[top * from.w + left]!;
      let most = 0;
      for (let sy = top; sy < bottom; sy++)
        for (let sx = left; sx < right; sx++) {
          const color = source[sy * from.w + sx]!;
          const count = (counts.get(color) ?? 0) + 1;
          counts.set(color, count);
          if (count > most) {
            most = count;
            best = color;
          }
        }
      out[y * w + x] = best;
    }
  }
  return new Uint8ClampedArray(out.buffer);
}

export const tooLarge = (anim: { w: number; h: number }) =>
  anim.w > MAX_PIGXEL_SIZE || anim.h > MAX_PIGXEL_SIZE;

export function croppedAnimation(
  anim: DecodedAnimation,
  area: { x: number; y: number; w: number; h: number },
): DecodedAnimation {
  return {
    w: area.w,
    h: area.h,
    frames: anim.frames.map(({ rgba, duration }) => {
      const out = new Uint8ClampedArray(area.w * area.h * 4);
      for (let y = 0; y < area.h; y++) {
        const start = ((area.y + y) * anim.w + area.x) * 4;
        out.set(rgba.subarray(start, start + area.w * 4), y * area.w * 4);
      }
      return { rgba: out, duration };
    }),
  };
}

export function fitted(
  anim: DecodedAnimation,
  box = { w: MAX_PIGXEL_SIZE, h: MAX_PIGXEL_SIZE },
): DecodedAnimation {
  const scale = Math.min(box.w / anim.w, box.h / anim.h);
  if (scale >= 1) return anim;
  const w = Math.max(1, Math.round(anim.w * scale));
  const h = Math.max(1, Math.round(anim.h * scale));
  if (looksLikePixelArt(anim.frames[0]!.rgba))
    return {
      w,
      h,
      frames: anim.frames.map(({ rgba, duration }) => ({
        rgba: sharpDownscale(rgba, anim, w, h),
        duration,
      })),
    };
  const source = document.createElement("canvas");
  source.width = anim.w;
  source.height = anim.h;
  const target = document.createElement("canvas");
  target.width = w;
  target.height = h;
  const from = source.getContext("2d");
  const to = target.getContext("2d", { willReadFrequently: true });
  if (!from || !to)
    throw new PigxelFileError("This browser can’t read the picture.");
  to.imageSmoothingQuality = "high";
  return {
    w,
    h,
    frames: anim.frames.map(({ rgba, duration }) => {
      from.putImageData(
        new ImageData(new Uint8ClampedArray(rgba), anim.w, anim.h),
        0,
        0,
      );
      to.clearRect(0, 0, w, h);
      to.drawImage(source, 0, 0, w, h);
      return { rgba: to.getImageData(0, 0, w, h).data, duration };
    }),
  };
}

async function readStill(file: File): Promise<DecodedAnimation> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new PigxelFileError("This browser can’t read the picture.");
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    return {
      w: bitmap.width,
      h: bitmap.height,
      frames: [{ rgba: data, duration: 100 }],
    };
  } finally {
    bitmap.close();
  }
}

export function sequenceOrder<T extends { name: string }>(files: T[]): T[] {
  return [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: "base",
    }),
  );
}

export function sequenceName(names: string[]) {
  const bases = names.map(imageBaseName);
  let shared = bases[0] ?? "";
  for (const base of bases.slice(1))
    while (!base.startsWith(shared)) shared = shared.slice(0, -1);
  return shared.replace(/[\s_\-.#]*\d*$/, "").trim() || bases[0] || "Untitled";
}

export async function documentFromSequence(
  files: File[],
): Promise<PigxelDocument> {
  const read = await Promise.all(sequenceOrder(files).map(readImage));
  const w = Math.max(...read.map((a) => a.w));
  const h = Math.max(...read.map((a) => a.h));
  const frames = read.flatMap((anim) =>
    anim.frames.map(({ rgba, duration }) => {
      if (anim.w === w && anim.h === h) return { rgba, duration };
      const out = new Uint8ClampedArray(w * h * 4);
      for (let y = 0; y < anim.h; y++)
        out.set(rgba.subarray(y * anim.w * 4, (y + 1) * anim.w * 4), y * w * 4);
      return { rgba: out, duration };
    }),
  );
  const anim = { w, h, frames };
  return documentFromFrames(fitted(unscaled(anim, pixelScale(anim))));
}

export async function pictureFromFile(file: File): Promise<DecodedAnimation> {
  const anim = await readImage(file);
  return unscaled(anim, pixelScale(anim));
}

export async function pictureForTile(
  file: File,
  size: { w: number; h: number },
): Promise<{ rgba: Uint8ClampedArray; w: number; h: number }> {
  const full = await readImage(file);
  const first = { ...full, frames: full.frames.slice(0, 1) };
  const anim = fitted(unscaled(first, pixelScale(first)), size);
  return { rgba: anim.frames[0]!.rgba, w: anim.w, h: anim.h };
}

export async function readPicture(
  file: File,
): Promise<{ rgba: Uint8ClampedArray; w: number; h: number }> {
  const anim = await readImage(file);
  return { rgba: anim.frames[0]!.rgba, w: anim.w, h: anim.h };
}

async function readImage(file: File): Promise<DecodedAnimation> {
  try {
    return /\.gif$/i.test(file.name) || file.type === "image/gif"
      ? decodeGif(new Uint8Array(await file.arrayBuffer()))
      : await readStill(file);
  } catch (error) {
    throw error instanceof PigxelFileError
      ? error
      : new PigxelFileError("This picture can’t be opened. Try a PNG or GIF.");
  }
}

export function documentFromFrames(anim: DecodedAnimation): PigxelDocument {
  const doc = blankDocument(anim.w, anim.h, "transparent");
  const layer = doc.layers[0]!;
  const frames = anim.frames.map((f) => createFrame(clampDuration(f.duration)));
  return {
    ...doc,
    frames,
    cels: new Map(
      frames.map((frame, i) => [
        frame.id,
        new Map([[layer.id, new Uint8ClampedArray(anim.frames[i]!.rgba)]]),
      ]),
    ),
    palette: colorsOf(anim.frames[0]!.rgba),
  };
}
