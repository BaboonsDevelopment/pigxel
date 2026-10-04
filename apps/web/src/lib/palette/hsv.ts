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

export function readHex(text: string): string | null {
  const v = text.trim().replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{3}$/.test(v)) return `#${[...v].map((c) => c + c).join("")}`;
  return /^[0-9a-f]{6}$/.test(v) ? `#${v}` : null;
}

export type Hsl = { h: number; s: number; l: number };

export function hsvToHsl({ h, s, v }: Hsv): Hsl {
  const l = v * (1 - s / 2);
  return { h, s: l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l), l };
}

export function hslToHsv({ h, s, l }: Hsl): Hsv {
  const v = l + s * Math.min(l, 1 - l);
  return { h, s: v === 0 ? 0 : 2 * (1 - l / v), v };
}

export function shadesOf(hex: string, steps = 3): string[] {
  const { h, s, l } = hsvToHsl(hexToHsv(hex));
  const out: string[] = [];
  for (let i = -steps; i <= steps; i++) {
    const shade = Math.min(
      1,
      Math.max(0, l + (i / (steps + 1)) * (i < 0 ? l : 1 - l)),
    );
    out.push(hsvToHex(hslToHsv({ h, s, l: shade })));
  }
  return out;
}
