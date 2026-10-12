import type { SVGProps } from "react";
import paint1 from "../../../../public/art/animate/paint-1.png";
import paint2 from "../../../../public/art/animate/paint-2.png";
import paint3 from "../../../../public/art/animate/paint-3.png";
import paint4 from "../../../../public/art/animate/paint-4.png";

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

/** Pigxel's pig, the picture the Draw playground starts from. */
export const PIG = [
  "................",
  "..rr........rr..",
  ".rbbr......rbbr.",
  ".rbbrrrrrrrrbbr.",
  "..rbbbbbbbbbbr..",
  ".rbbbbbbbbbbbbr.",
  ".rbbkbbbbbbkbbr.",
  ".rbbkbbbbbbkbbr.",
  ".rbbbrrrrrrbbbr.",
  ".rbbbrkbbkrbbbr.",
  ".rbbbrrrrrrbbbr.",
  "..rrbbbbbbbbrr..",
  "..rbbrbbbbrbbr..",
  "..rbbrbbbbrbbr..",
  "..rkkrrrrrrkkr..",
  "................",
] as const;

/** The pig painting a flower: four frames, drawn to line up exactly. */
export const PAINT_FRAMES = [paint1, paint2, paint3, paint4];
