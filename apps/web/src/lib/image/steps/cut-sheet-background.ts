import { copyBitmap, type Bitmap } from "../bitmap";

/** Recover an opaque key/backdrop only when animation segmentation has failed.
 * Samples the perimeter and floods from outside; enclosed white/pink details stay intact.
 */
export function cutSheetBackground(source: Bitmap): Bitmap | null {
  const edge: number[] = [];
  for (let x = 0; x < source.w; x++)
    edge.push(x, (source.h - 1) * source.w + x);
  for (let y = 1; y < source.h - 1; y++)
    edge.push(y * source.w, (y + 1) * source.w - 1);
  const modes = new Map<
    string,
    { rgb: number[]; n: number; neutral: boolean }
  >();
  let opaque = 0;
  for (const i of edge) {
    const r = source.rgba[i * 4]!,
      g = source.rgba[i * 4 + 1]!,
      b = source.rgba[i * 4 + 2]!,
      a = source.rgba[i * 4 + 3]!;
    if (!a) continue;
    opaque++;
    const neutral =
      Math.max(r!, g!, b!) - Math.min(r!, g!, b!) <= 16 &&
      Math.min(r!, g!, b!) >= 180;
    const key = r! >= 120 && b! >= 100 && g! < Math.min(r!, b!) * 0.6;
    if (!neutral && !key) continue;
    const bin = [r, g, b].map((v) => Math.floor(v! / 16)).join(",");
    const old = modes.get(bin);
    if (old) old.n++;
    else modes.set(bin, { rgb: [r!, g!, b!], n: 1, neutral });
  }
  if (opaque < edge.length * 0.8) return null;
  const sorted = [...modes.values()].sort((a, b) => b.n - a.n);
  const first = sorted[0];
  if (!first) return null;
  const palette = sorted
    .filter((m) => m.neutral === first.neutral)
    .slice(0, first.neutral ? 2 : 1);
  if (palette.reduce((n, m) => n + m.n, 0) < opaque * 0.7) return null;
  const matches = (i: number) => {
    if (!source.rgba[i * 4 + 3]) return true;
    return palette.some(
      ({ rgb }) =>
        rgb.reduce(
          (sum, c, j) => sum + (source.rgba[i * 4 + j]! - c) ** 2,
          0,
        ) <=
        40 ** 2,
    );
  };
  const out = copyBitmap(source);
  const seen = new Uint8Array(source.w * source.h);
  const queue = new Uint32Array(seen.length);
  let tail = 0,
    removed = 0;
  const add = (i: number) => {
    if (seen[i] || !matches(i)) return;
    seen[i] = 1;
    queue[tail++] = i;
  };
  edge.forEach(add);
  for (let head = 0; head < tail; head++) {
    const i = queue[head]!,
      x = i % source.w,
      y = Math.floor(i / source.w);
    if (out.rgba[i * 4 + 3]) removed++;
    out.rgba.fill(0, i * 4, i * 4 + 4);
    if (x) add(i - 1);
    if (x + 1 < source.w) add(i + 1);
    if (y) add(i - source.w);
    if (y + 1 < source.h) add(i + source.w);
  }
  return removed >= seen.length * 0.05 ? out : null;
}
