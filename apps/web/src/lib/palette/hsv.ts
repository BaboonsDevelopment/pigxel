/**
 * Hue, saturation and value, as the colour picker shows them: hue 0–360,
 * saturation and value 0–1. Colours elsewhere are `#rrggbb`.
 */
export type Hsv = { h: number; s: number; v: number };

export function hexToHsv(hex: string): Hsv {
  const n = parseInt(hex.replace("#", ""), 16) || 0;
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  const h = !d
    ? 0
    : max === r
      ? ((g - b) / d + 6) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return { h: h * 60, s: max ? d / max : 0, v: max };
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const f = (k: number) => {
    const at = (k + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(at, 4 - at, 1));
  };
  return `#${[f(5), f(3), f(1)]
    .map((c) =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** A typed colour as `#rrggbb` (with or without #, three or six digits), or null. */
export function readHex(text: string): string | null {
  const v = text.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) return `#${[...v].map((c) => c + c).join("")}`;
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
}
