import { GRID, MAX_POINTS_PER_OP } from "./constants";
import {
  ellipsePoints,
  floodPoints,
  hexToRgba,
  linePoints,
  rectPoints,
  TRANSPARENT,
  type Point,
  type Rect,
  type RGBA,
} from "./raster";

export type Op =
  | { t: "pal"; c: string; hex: string }
  | { t: "px"; c: string; pts: Point[] }
  | { t: "blit"; at: Point; rows: string[] }
  | { t: "rect" | "ellipse"; c: string; box: Rect; fill: boolean }
  | { t: "line"; c: string; from: Point; to: Point }
  | { t: "bucket"; c: string; at: Point }
  | { t: "swap"; from: string; to: string }
  | { t: "mirror"; axis: "v" | "h" }
  | { t: "clear" };

const HEX = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function point(token = ""): Point | null {
  const m = /^(-?\d{1,5}),(-?\d{1,5})$/.exec(token);
  return m ? { x: Number(m[1]), y: Number(m[2]) } : null;
}

function size(token = ""): { w: number; h: number } | null {
  const m = /^(\d{1,5})x(\d{1,5})$/i.exec(token);
  return m && Number(m[1]) > 0 && Number(m[2]) > 0
    ? { w: Number(m[1]), h: Number(m[2]) }
    : null;
}

/** Reads the AI's operation lines; bad lines are reported and skipped. */
export function parseOps(lines: string[]): { ops: Op[]; errors: string[] } {
  const ops: Op[] = [];
  const errors: string[] = [];
  lines.forEach((line, i) => {
    const [verb = "", ...rest] = line.trim().split(/\s+/);
    const bad = (msg: string) => errors.push(`op ${i} (${verb}): ${msg}`);
    const char = rest[0] ?? "";
    const oneChar = char.length === 1;
    switch (verb.toLowerCase()) {
      case "pal":
        if (!oneChar || !HEX.test(rest[1] ?? ""))
          return bad("pal <char> <#rrggbb>");
        return void ops.push({ t: "pal", c: char, hex: rest[1]! });
      case "px": {
        const pts = rest.slice(1, 1 + MAX_POINTS_PER_OP).map(point);
        if (!oneChar || !pts.length || pts.some((p) => !p)) {
          return bad("px <char> <x,y> ...");
        }
        return void ops.push({ t: "px", c: char, pts: pts as Point[] });
      }
      case "blit": {
        const at = point(rest[0]);
        const rows = (rest[1] ?? "").split("/").filter(Boolean);
        if (!at || !rows.length) return bad("blit <x,y> <rows>");
        return void ops.push({ t: "blit", at, rows });
      }
      case "rect":
      case "ellipse": {
        const at = point(rest[1]);
        const wh = size(rest[2]);
        if (!oneChar || !at || !wh) return bad(`${verb} <char> <x,y> <w>x<h>`);
        const fill = rest.slice(3).some((w) => w.toLowerCase() === "fill");
        return void ops.push({
          t: verb.toLowerCase() as "rect" | "ellipse",
          c: char,
          box: { ...at, ...wh },
          fill,
        });
      }
      case "line": {
        const from = point(rest[1]);
        const to = point(rest[2]);
        if (!oneChar || !from || !to) return bad("line <char> <x1,y1> <x2,y2>");
        return void ops.push({ t: "line", c: char, from, to });
      }
      case "bucket": {
        const at = point(rest[1]);
        if (!oneChar || !at) return bad("bucket <char> <x,y>");
        return void ops.push({ t: "bucket", c: char, at });
      }
      case "swap":
        if (!oneChar || rest[1]?.length !== 1) return bad("swap <from> <to>");
        return void ops.push({ t: "swap", from: char, to: rest[1] });
      case "mirror": {
        const axis = char.toLowerCase();
        if (axis !== "v" && axis !== "h") return bad("mirror v | mirror h");
        return void ops.push({ t: "mirror", axis });
      }
      case "clear":
        return void ops.push({ t: "clear" });
      default:
        errors.push(`op ${i}: unknown operation "${verb}"`);
    }
  });
  return { ops, errors };
}

/**
 * Runs `ops` on a copy of the tile. Every write is clipped to `area`, so the
 * AI cannot touch pixels outside what it was given.
 */
export function applyOps(
  source: Uint8ClampedArray,
  width: number,
  ops: Op[],
  palette: Record<string, string>,
  area: Rect,
): { pixels: Uint8ClampedArray; applied: number; errors: string[] } {
  const pixels = new Uint8ClampedArray(source);
  const colors = { ...palette };
  const errors: string[] = [];
  let applied = 0;

  const inArea = ({ x, y }: Point) =>
    x >= area.x && y >= area.y && x < area.x + area.w && y < area.y + area.h;
  const color = (c: string): RGBA | null =>
    c === GRID.transparent
      ? TRANSPARENT
      : colors[c] && HEX.test(colors[c])
        ? hexToRgba(colors[c])
        : null;
  const put = (p: Point, c: RGBA) => {
    if (!inArea(p)) return false;
    pixels.set([c.r, c.g, c.b, c.a], (p.y * width + p.x) * 4);
    return true;
  };
  const draw = (i: number, points: Point[], c: string) => {
    const rgba = color(c);
    if (!rgba) return errors.push(`op ${i}: unknown colour "${c}"`);
    if (points.filter((p) => put(p, rgba)).length) applied++;
    else errors.push(`op ${i}: nothing inside the area`);
  };
  const rgbaAt = (p: Point) =>
    pixels.slice((p.y * width + p.x) * 4, (p.y * width + p.x) * 4 + 4);

  ops.forEach((op, i) => {
    switch (op.t) {
      case "pal":
        colors[op.c] = op.hex;
        return;
      case "px":
        return void draw(i, op.pts, op.c);
      case "blit": {
        const points: Point[] = [];
        const chars: string[] = [];
        op.rows.forEach((row, dy) =>
          [...row].forEach((c, dx) => {
            if (c === GRID.keep) return;
            points.push({ x: op.at.x + dx, y: op.at.y + dy });
            chars.push(c);
          }),
        );
        let hits = 0;
        points.forEach((p, k) => {
          const rgba = color(chars[k]!);
          if (rgba && put(p, rgba)) hits++;
        });
        if (hits) applied++;
        else errors.push(`op ${i}: nothing inside the area`);
        return;
      }
      case "rect":
        return void draw(i, rectPoints(op.box, op.fill), op.c);
      case "ellipse":
        return void draw(i, ellipsePoints(op.box, op.fill), op.c);
      case "line":
        return void draw(i, linePoints(op.from, op.to), op.c);
      case "bucket":
        if (!inArea(op.at))
          return void errors.push(`op ${i}: outside the area`);
        return void draw(i, floodPoints(pixels, width, op.at, area), op.c);
      case "swap": {
        const from = color(op.from);
        if (!from)
          return void errors.push(`op ${i}: unknown colour "${op.from}"`);
        const match: Point[] = [];
        for (let y = area.y; y < area.y + area.h; y++) {
          for (let x = area.x; x < area.x + area.w; x++) {
            const [r, g, b, a] = rgbaAt({ x, y });
            const same =
              from.a === 0
                ? a === 0
                : a !== 0 && r === from.r && g === from.g && b === from.b;
            if (same) match.push({ x, y });
          }
        }
        return void draw(i, match, op.to);
      }
      case "mirror": {
        const half =
          op.axis === "v" ? Math.floor(area.w / 2) : Math.floor(area.h / 2);
        for (let k = 0; k < half; k++) {
          const lines = op.axis === "v" ? area.h : area.w;
          for (let n = 0; n < lines; n++) {
            const from =
              op.axis === "v"
                ? { x: area.x + k, y: area.y + n }
                : { x: area.x + n, y: area.y + k };
            const to =
              op.axis === "v"
                ? { x: area.x + area.w - 1 - k, y: from.y }
                : { x: from.x, y: area.y + area.h - 1 - k };
            pixels.set(rgbaAt(from), (to.y * width + to.x) * 4);
          }
        }
        applied++;
        return;
      }
      case "clear":
        for (let y = area.y; y < area.y + area.h; y++) {
          pixels.fill(
            0,
            (y * width + area.x) * 4,
            (y * width + area.x + area.w) * 4,
          );
        }
        applied++;
        return;
    }
  });
  return { pixels, applied, errors };
}
