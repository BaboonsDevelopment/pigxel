import type { SVGProps } from "react";

/**
 * A sprite drawn from rows of characters, one per pixel: `.` is empty and
 * every other character is looked up in `colors`. Runs of one colour become
 * one rect, so even a 16×16 sprite stays a handful of elements.
 */
export function PixelSprite({
  rows,
  colors,
  ...props
}: { rows: readonly string[]; colors: Record<string, string> } & Omit<
  SVGProps<SVGSVGElement>,
  "children"
>) {
  const width = Math.max(...rows.map((row) => row.length));
  const rects: { x: number; y: number; w: number; fill: string }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const key = row[x]!;
      let end = x + 1;
      while (end < row.length && row[end] === key) end++;
      const fill = colors[key];
      if (key !== "." && fill) rects.push({ x, y, w: end - x, fill });
      x = end;
    }
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${rows.length}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...props}
    >
      {rects.map((rect) => (
        <rect
          key={`${rect.x}-${rect.y}`}
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={1}
          fill={rect.fill}
        />
      ))}
    </svg>
  );
}

/** Little 8×8 icons for the "made for" strip. */
export const ICONS = {
  heart: {
    rows: [
      "........",
      ".rr..rr.",
      "rwrrrrrr",
      "rrrrrrrr",
      ".rrrrrr.",
      "..rrrr..",
      "...rr...",
      "........",
    ],
    colors: { r: "#e04a6a", w: "#ffd3dc" },
  },
  tree: {
    rows: [
      "...gg...",
      "..gggg..",
      ".gglggg.",
      "gggggggg",
      ".gggglg.",
      "..gggg..",
      "...bb...",
      "...bb...",
    ],
    colors: { g: "#3f9b5a", l: "#8fd08a", b: "#8a5a3b" },
  },
  house: {
    rows: [
      "...rr...",
      "..rrrr..",
      ".rrrrrr.",
      "rrrrrrrr",
      ".wwwwww.",
      ".wbwwdw.",
      ".wwwwdw.",
      ".wwwwdw.",
    ],
    colors: { r: "#d0573f", w: "#f6e2bf", b: "#7cc4e8", d: "#8a5a3b" },
  },
  sword: {
    rows: [
      "......ss",
      ".....sws",
      "....sws.",
      "...sws..",
      ".hssw...",
      "..hs....",
      ".h.h....",
      "g.......",
    ],
    colors: { s: "#8a93a6", w: "#e9edf5", h: "#8a5a3b", g: "#e7be5f" },
  },
  film: {
    rows: [
      "kkkkkkkk",
      "kwkwkwkk",
      "kppkyykk",
      "kppkyykk",
      "kkkkkkkk",
      "kwkwkwkk",
      "........",
      "........",
    ],
    colors: { k: "#2d2a32", w: "#f4f1ea", p: "#f3a3b7", y: "#ffd76a" },
  },
  star: {
    rows: [
      "...yy...",
      "...yy...",
      "yyyyyyyy",
      ".yywyyy.",
      "..yyyy..",
      ".yy..yy.",
      "yy....yy",
      "........",
    ],
    colors: { y: "#f5b82e", w: "#fff4c2" },
  },
  potion: {
    rows: [
      "...cc...",
      "...gg...",
      "..g..g..",
      ".g.w..g.",
      ".gppppg.",
      ".gppppg.",
      "..gggg..",
      "........",
    ],
    colors: { c: "#8a5a3b", g: "#9aa3b5", w: "#ffffff", p: "#9b6bea" },
  },
  coin: {
    rows: [
      "..yyyy..",
      ".yyyyyy.",
      "yyowyyyy",
      "yyoyyyyy",
      "yyoyyyyy",
      "yyyyyyyy",
      ".yyyyyy.",
      "..yyyy..",
    ],
    colors: { y: "#f5b82e", o: "#c9861a", w: "#fff4c2" },
  },
  cat: {
    rows: [
      "o......o",
      "oo....oo",
      "oooooooo",
      "okoooko.",
      "oooooooo",
      "oooppooo",
      ".oooooo.",
      "........",
    ],
    colors: { o: "#f29b4b", k: "#2d2a32", p: "#f3a3b7" },
  },
} satisfies Record<
  string,
  { rows: readonly string[]; colors: Record<string, string> }
>;

/** The flower the playground and the AI demo start from. */
export const FLOWER = [
  "................",
  "................",
  "......pp........",
  ".....pppp.......",
  "....pppppp......",
  "...pppyyppp.....",
  "...ppyyyypp.....",
  "....ppyypp......",
  ".....pppp.......",
  ".......g........",
  "....gg.g........",
  ".....ggg.gg.....",
  ".......ggg......",
  ".......g........",
  "................",
  "................",
] as const;

/**
 * Pigxel's pig face (the brand mark) as an animation frame: `lift` raises
 * it for the hop, `blink` closes its eyes.
 */
export function PigFrame({
  lift = 0,
  blink = false,
  ...props
}: { lift?: number; blink?: boolean } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      shapeRendering="crispEdges"
      aria-hidden="true"
      {...props}
    >
      <path fill="#2d2a32" opacity="0.12" d="M7 22h10v1H7Z" />
      <g transform={`translate(0 ${-lift})`}>
        <path fill="#d64a62" d="M3 3h6v3h6V3h6v15h-3v3H6v-3H3Z" />
        <path fill="#ffa4b2" d="M5 5h3v4h8V5h3v12h-3v2H8v-2H5Z" />
        <path
          fill="#542a35"
          d={blink ? "M7 12h2v1H7zm8 0h2v1h-2Z" : "M7 10h2v3H7zm8 0h2v3h-2Z"}
        />
        <path fill="#ef748d" d="M8 14h8v4H8Z" />
        <path fill="#9e384e" d="M10 15h1v2h-1zm3 0h1v2h-1Z" />
      </g>
    </svg>
  );
}

/** The four frames of the pig's hop, as the demos play them. */
export const PIG_FRAMES = [
  { lift: 0, blink: false },
  { lift: 1, blink: false },
  { lift: 2, blink: true },
  { lift: 1, blink: false },
] as const;
