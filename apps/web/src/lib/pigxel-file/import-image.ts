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

function fitted(
  anim: DecodedAnimation,
  box = { w: MAX_PIGXEL_SIZE, h: MAX_PIGXEL_SIZE },
): DecodedAnimation {
  const scale = Math.min(box.w / anim.w, box.h / anim.h);
  if (scale >= 1) return anim;
  const w = Math.max(1, Math.round(anim.w * scale));
  const h = Math.max(1, Math.round(anim.h * scale));
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

export async function documentFromImage(file: File): Promise<PigxelDocument> {
  const anim = await readImage(file);
  return documentFromFrames(fitted(unscaled(anim, pixelScale(anim))));
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
