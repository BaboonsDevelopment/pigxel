import { flattenDocument, parsePigxel } from "@/lib/pigxel-file/format";

export type Picture = {
  width: number;
  height: number;
  frames: { pixels: ImageData; duration: number }[];
  animated: boolean;
};

function samePixels(a: ImageData, b: ImageData) {
  for (let i = 0; i < a.data.length; i++)
    if (a.data[i] !== b.data[i]) return false;
  return true;
}

export function toPicture(text: string): Picture {
  const doc = parsePigxel(text);
  const frames = doc.frames.map((f) => ({
    pixels: new ImageData(
      flattenDocument(
        doc,
        ["reference"],
        f.id,
      ) as Uint8ClampedArray<ArrayBuffer>,
      doc.width,
      doc.height,
    ),
    duration: f.duration,
  }));
  return {
    width: doc.width,
    height: doc.height,
    frames,
    animated: frames.some((f) => !samePixels(f.pixels, frames[0]!.pixels)),
  };
}

export function paletteOf(pixels: ImageData, size = 7): string[] {
  const counts = new Map<number, number>();
  const { data } = pixels;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 128) continue;
    const key = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, size)
    .map(([key]) => `#${key.toString(16).padStart(6, "0")}`);
}
