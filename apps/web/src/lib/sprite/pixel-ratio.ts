export type PixelRatio = { w: 1 | 2; h: 1 | 2 };

export const SQUARE: PixelRatio = { w: 1, h: 1 };

export const PIXEL_RATIOS: { ratio: PixelRatio; label: string }[] = [
  { ratio: SQUARE, label: "Square pixels (1:1)" },
  { ratio: { w: 2, h: 1 }, label: "Wide pixels (2:1)" },
  { ratio: { w: 1, h: 2 }, label: "Tall pixels (1:2)" },
];

export const isSquare = (r: PixelRatio | undefined) =>
  !r || (r.w === 1 && r.h === 1);

export const sameRatio = (a: PixelRatio, b: PixelRatio) =>
  a.w === b.w && a.h === b.h;

export function readPixelRatio(value: unknown): PixelRatio {
  if (typeof value !== "object" || value === null) return SQUARE;
  const { w, h } = value as Record<string, unknown>;
  return (
    PIXEL_RATIOS.find((r) => r.ratio.w === w && r.ratio.h === h)?.ratio ??
    SQUARE
  );
}
