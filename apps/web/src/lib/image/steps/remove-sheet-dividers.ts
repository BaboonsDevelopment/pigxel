import { copyBitmap, type Bitmap } from "../bitmap";

/** Remove only narrow, almost uniform, full-span interior rules, not outlines. */
export function removeSheetDividers(
  image: Bitmap,
  grid: { cols: number; rows: number },
  count: number,
): Bitmap {
  const bands = (vertical: boolean) => {
    const across = vertical ? image.w : image.h;
    const along = vertical ? image.h : image.w;
    const lines: number[] = [];
    for (let x = 1; x < across - 1; x++) {
      const sample = (vertical ? x : x * image.w) * 4;
      const rgb = image.rgba.subarray(sample, sample + 3);
      if (Math.max(...rgb) > 200 || !image.rgba[sample + 3]) continue;
      let same = 0;
      for (let y = 0; y < along; y++) {
        const p = (vertical ? y * image.w + x : x * image.w + y) * 4;
        if (
          image.rgba[p + 3] &&
          Math.abs(image.rgba[p]! - rgb[0]!) +
            Math.abs(image.rgba[p + 1]! - rgb[1]!) +
            Math.abs(image.rgba[p + 2]! - rgb[2]!) <=
            60
        )
          same++;
      }
      if (same / along >= 0.95) lines.push(x);
    }
    const runs: number[][] = [];
    for (const x of lines) {
      const last = runs.at(-1);
      if (last && last.at(-1) === x - 1) last.push(x);
      else runs.push([x]);
    }
    return runs.filter(
      (run) =>
        run.length <= Math.max(2, Math.round(across * 0.025)) &&
        run[0]! > across * 0.05 &&
        run.at(-1)! < across * 0.95,
    );
  };
  const vertical = bands(true),
    horizontal = bands(false);
  const matching = (runs: number[][], cells: number, length: number) =>
    Array.from({ length: cells - 1 }, (_, i) =>
      runs.find(
        (r) =>
          Math.abs((r[0]! + r.at(-1)!) / 2 - ((i + 1) * length) / cells) <
          (length / cells) * 0.1,
      ),
    );
  const candidates = [
    grid,
    ...Array.from({ length: count }, (_, i) => ({
      cols: i + 1,
      rows: Math.ceil(count / (i + 1)),
    })),
  ];
  const found = candidates
    .map((g) => ({
      xs: matching(vertical, g.cols, image.w),
      ys: matching(horizontal, g.rows, image.h),
    }))
    .find(
      ({ xs, ys }) =>
        xs.length + ys.length > 0 && [...xs, ...ys].every(Boolean),
    );
  if (!found) return image;
  const expand = (runs: (number[] | undefined)[], length: number) =>
    runs.flatMap((r) =>
      r
        ? [r[0]! - 2, r[0]! - 1, ...r, r.at(-1)! + 1, r.at(-1)! + 2].filter(
            (x) => x >= 0 && x < length,
          )
        : [],
    );
  const xs = expand(found.xs, image.w),
    ys = expand(found.ys, image.h);
  const out = copyBitmap(image);
  for (const x of xs)
    for (let y = 0; y < out.h; y++)
      out.rgba.fill(0, (y * out.w + x) * 4, (y * out.w + x + 1) * 4);
  for (const y of ys) out.rgba.fill(0, y * out.w * 4, (y + 1) * out.w * 4);
  return out;
}
