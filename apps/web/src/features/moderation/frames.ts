import { flattenDocument, type PigxelDocument } from "@/lib/pigxel-file/format";
import { INPUT_SIZE, LIMITS } from "./constants";

export type Scores = {
  Drawing: number;
  Hentai: number;
  Neutral: number;
  Porn: number;
  Sexy: number;
};

export function modelInput(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  backdrop: number,
): Uint8Array {
  const out = new Uint8Array(INPUT_SIZE * INPUT_SIZE * 3);
  for (let y = 0; y < INPUT_SIZE; y++) {
    const sy = Math.floor((y * height) / INPUT_SIZE);
    for (let x = 0; x < INPUT_SIZE; x++) {
      const sx = Math.floor((x * width) / INPUT_SIZE);
      const from = (sy * width + sx) * 4;
      const alpha = rgba[from + 3]! / 255;
      const to = (y * INPUT_SIZE + x) * 3;
      for (let c = 0; c < 3; c++)
        out[to + c] = Math.round(
          rgba[from + c]! * alpha + backdrop * (1 - alpha),
        );
    }
  }
  return out;
}

export function frameImages(doc: PigxelDocument): Uint8Array[] {
  const backdrop = doc.background === "black" ? 0 : 255;
  const seen = new Set<string>();
  const images: Uint8Array[] = [];
  for (const frame of doc.frames) {
    const image = modelInput(
      flattenDocument(doc, undefined, frame.id),
      doc.width,
      doc.height,
      backdrop,
    );
    const key = fingerprint(image);
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(image);
  }
  return images;
}

function fingerprint(bytes: Uint8Array) {
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `${bytes.length}:${hash >>> 0}`;
}

const explicit = (s: Scores) => s.Porn + s.Hentai;

export function isAllowed(frames: Scores[]) {
  return frames.every(
    (s) => explicit(s) < LIMITS.explicit && s.Sexy < LIMITS.suggestive,
  );
}

export function worstFrame(frames: Scores[]): Scores | null {
  return frames.reduce<Scores | null>(
    (worst, s) =>
      !worst || explicit(s) + s.Sexy > explicit(worst) + worst.Sexy ? s : worst,
    null,
  );
}
