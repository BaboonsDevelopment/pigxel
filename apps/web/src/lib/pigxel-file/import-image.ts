import { decodeGif, type DecodedAnimation } from "@/lib/image/gif-decode";
import { colorsOf } from "@/lib/palette/presets";
import { clampDuration, createFrame } from "@/lib/sprite/frames";
import {
  MAX_PIGXEL_SIZE,
  PigxelFileError,
  blankDocument,
  type PigxelDocument,
} from "./format";

/** Pictures that open as a new tile, for a file picker's `accept`. */
export const IMAGE_FILE_TYPES =
  ".png,.gif,.jpg,.jpeg,.webp,.bmp,image/png,image/gif,image/jpeg,image/webp,image/bmp";

const IMAGE_EXTENSION = /\.(png|gif|jpe?g|webp|bmp)$/i;

/** Whether a chosen file is a picture rather than a .pigxel file. */
export function isImageFile(file: File) {
  return file.type.startsWith("image/") || IMAGE_EXTENSION.test(file.name);
}

/** The file's name without its picture extension, for the new tile. */
export function imageBaseName(name: string) {
  return name.replace(IMAGE_EXTENSION, "") || "Untitled";
}

/**
 * The largest k for which every k × k block of every frame is one colour:
 * pixel art saved enlarged (a 32 px sprite exported at 8×) comes back at its
 * own size. 1 when there is none.
 */
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

/** Every frame shrunk by a whole `k`, one pixel per k × k block. */
function unscaled(anim: DecodedAnimation, k: number): DecodedAnimation {
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

/** Every frame shrunk smoothly to fit within `box`, keeping its shape. */
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

/** A still picture's pixels at full size. */
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

/**
 * A picture file as a new tile: every frame of a GIF (with its timing), on
 * one layer, with a palette of the picture's colours. Pixel art saved
 * enlarged comes back at its own size; anything still bigger than the
 * largest tile is shrunk to fit.
 */
export async function documentFromImage(file: File): Promise<PigxelDocument> {
  const anim = await readImage(file);
  return documentFromFrames(fitted(unscaled(anim, pixelScale(anim))));
}

/**
 * A picture file to put on a tile of `size`: its first frame, enlarged pixel
 * art at its own size, and shrunk to fit the tile when bigger.
 */
export async function pictureForTile(
  file: File,
  size: { w: number; h: number },
): Promise<{ rgba: Uint8ClampedArray; w: number; h: number }> {
  const full = await readImage(file);
  const first = { ...full, frames: full.frames.slice(0, 1) };
  const anim = fitted(unscaled(first, pixelScale(first)), size);
  return { rgba: anim.frames[0]!.rgba, w: anim.w, h: anim.h };
}

/** Every frame of a picture file at its full size. */
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

/** Decoded frames as a tile with one layer, transparent where they are. */
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
