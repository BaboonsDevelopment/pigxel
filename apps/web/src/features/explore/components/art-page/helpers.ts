import {
  backgroundColor,
  flattenDocument,
  parsePigxel,
} from "@/lib/pigxel-file/format";

export type Picture = {
  width: number;
  height: number;
  frames: { pixels: ImageData; duration: number }[];
  animated: boolean;
  background: string | null;
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
    background: backgroundColor(doc.background),
  };
}
