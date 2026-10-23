import { components } from "@/lib/edit/objects";
import { opaqueBox, resizeNearest, type Bitmap, type Box } from "./bitmap";

export type AnimationAnchor = "ground" | "body" | "fixed";

const mainBox = (image: Bitmap) =>
  components(image.rgba, image.w, image.h).sort(
    (a, b) => b.members.length - a.members.length,
  )[0]?.box ?? null;

function score(
  reference: Bitmap,
  moving: Bitmap,
  box: Box,
  dx: number,
  dy: number,
  ground: boolean,
) {
  let result = 0;
  // Ears, heads and loose cloth must not pull a planted body sideways.
  const top = box.y + Math.floor(box.h * (ground ? 0.5 : 0.25));
  const bottom = box.y + Math.ceil(box.h * (ground ? 1 : 0.85));
  for (let y = top; y < bottom; y++)
    for (let x = box.x; x < box.x + box.w; x++) {
      const a = (y * reference.w + x) * 4;
      const xx = x - dx,
        yy = y - dy;
      const b = (yy * moving.w + xx) * 4;
      const visible =
        xx >= 0 &&
        xx < moving.w &&
        yy >= 0 &&
        yy < moving.h &&
        moving.rgba[b + 3]! > 0;
      if (!reference.rgba[a + 3] && !visible) continue;
      if (reference.rgba[a + 3] && visible) {
        const distance =
          Math.abs(reference.rgba[a]! - moving.rgba[b]!) +
          Math.abs(reference.rgba[a + 1]! - moving.rgba[b + 1]!) +
          Math.abs(reference.rgba[a + 2]! - moving.rgba[b + 2]!);
        result += 3 - distance / 255;
      } else result -= 1;
    }
  return result;
}

/** Register root drift using translations, then fit the ENTIRE sequence once. */
export function registerAnimationFrames(
  frames: (Bitmap | null)[],
  anchor: AnimationAnchor = "ground",
): (Bitmap | null)[] {
  if (anchor === "fixed") return frames;
  const reference = frames.find((frame): frame is Bitmap => !!frame);
  if (!reference) return frames;
  const root = mainBox(reference);
  if (!root) return frames;
  const maxShift = Math.max(
    1,
    Math.min(12, Math.round(Math.min(reference.w, reference.h) * 0.2)),
  );
  const shifts = frames.map((frame, index) => {
    const box = frame && mainBox(frame);
    if (!frame || !box || index === 0) return { x: 0, y: 0 };
    const groundY = root.y + root.h - box.y - box.h;
    let best = { x: 0, y: anchor === "ground" ? groundY : 0, score: -Infinity };
    const ys =
      anchor === "ground"
        ? [groundY]
        : Array.from({ length: maxShift * 2 + 1 }, (_, i) => i - maxShift);
    for (const y of ys)
      for (let x = -maxShift; x <= maxShift; x++) {
        const value = score(reference, frame, root, x, y, anchor === "ground");
        if (
          value > best.score + 0.001 ||
          (Math.abs(value - best.score) < 0.001 &&
            Math.abs(x) + Math.abs(y) < Math.abs(best.x) + Math.abs(best.y))
        )
          best = { x, y, score: value };
      }
    const baseY = anchor === "ground" ? groundY : 0;
    const baseline = score(
      reference,
      frame,
      root,
      0,
      baseY,
      anchor === "ground",
    );
    return best.score > baseline + Math.abs(baseline) * 0.03
      ? best
      : { x: 0, y: baseY };
  });
  const bounds = frames.flatMap((frame, i) => {
    const box = frame && opaqueBox(frame);
    return box
      ? [
          {
            x: box.x + shifts[i]!.x,
            y: box.y + shifts[i]!.y,
            w: box.w,
            h: box.h,
          },
        ]
      : [];
  });
  if (!bounds.length) return frames;
  const left = Math.min(...bounds.map((b) => b.x)),
    top = Math.min(...bounds.map((b) => b.y));
  const right = Math.max(...bounds.map((b) => b.x + b.w)),
    bottom = Math.max(...bounds.map((b) => b.y + b.h));
  const width = right - left,
    height = bottom - top;
  const margin = Math.min(reference.w, reference.h) >= 32 ? 2 : 0;
  const scale = Math.min(
    1,
    (reference.w - margin * 2) / width,
    (reference.h - margin * 2) / height,
  );
  const w = Math.max(1, Math.floor(width * scale)),
    h = Math.max(1, Math.floor(height * scale));
  const x = Math.max(margin, Math.min(reference.w - margin - w, left));
  const y = Math.max(margin, Math.min(reference.h - margin - h, top));
  return frames.map((frame, i) => {
    if (!frame) return null;
    const union: Bitmap = {
      w: width,
      h: height,
      rgba: new Uint8ClampedArray(width * height * 4),
    };
    for (let py = 0; py < frame.h; py++)
      for (let px = 0; px < frame.w; px++) {
        const from = (py * frame.w + px) * 4;
        if (!frame.rgba[from + 3]) continue;
        const tx = px + shifts[i]!.x - left,
          ty = py + shifts[i]!.y - top;
        union.rgba.set(
          frame.rgba.subarray(from, from + 4),
          (ty * width + tx) * 4,
        );
      }
    const small = resizeNearest(union, w, h);
    const out: Bitmap = {
      w: reference.w,
      h: reference.h,
      rgba: new Uint8ClampedArray(reference.w * reference.h * 4),
    };
    for (let py = 0; py < h; py++)
      out.rgba.set(
        small.rgba.subarray(py * w * 4, (py + 1) * w * 4),
        ((py + y) * out.w + x) * 4,
      );
    return out;
  });
}
