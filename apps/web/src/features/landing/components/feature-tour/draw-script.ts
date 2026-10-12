import { PIG } from "../pixel-art";

/**
 * The Draw chapter's recording: a cursor drawing the Pigxel pig the way a
 * person would in the editor. Mirror drawing is on, so it draws the left half
 * and the right half appears with it; it picks colours and tools from the
 * dock, fills the body with the bucket and adds the details last.
 */

export const SIZE = 16;

export type Tool = "pencil" | "eraser" | "bucket";

export const PIG_COLORS = {
  r: "#d06a88",
  b: "#edb3c5",
  k: "#343330",
} as const;

/** Where the cursor is: a pixel of the art, or a control in the dock. */
export type Target = { cell: [number, number] } | { ui: string };

export type Waypoint = {
  at: number;
  target: Target;
  /** "glide" eases in and out like a hand moving; "line" is a steady stroke. */
  ease: "glide" | "line";
};

export type Action =
  | {
      at: number;
      type: "paint";
      cell: number;
      color: string;
      mirrored?: boolean;
    }
  | { at: number; type: "tool"; tool: Tool }
  | { at: number; type: "color"; color: string }
  | { at: number; type: "press"; target: Target };

export type DrawScript = {
  waypoints: Waypoint[];
  actions: Action[];
  duration: number;
};

const STEP = 45;
const NEAR = 260;
const FAR = 420;
const DOCK = 220;
const PRESS = 140;
const FILL_RING = 26;

export const cellOf = (x: number, y: number) => y * SIZE + x;
export const mirrorOf = (cell: number) =>
  Math.floor(cell / SIZE) * SIZE + (SIZE - 1 - (cell % SIZE));

/** The rose outline of the left half, as three continuous strokes. */
// prettier-ignore
const OUTLINE: [number, number][][] = [
  [[7, 3], [6, 3], [5, 3], [4, 3], [4, 2], [3, 1], [2, 1], [1, 2], [1, 3],
   [2, 4], [1, 5], [1, 6], [1, 7], [1, 8], [1, 9], [1, 10], [2, 11], [3, 11],
   [2, 12], [2, 13], [2, 14]],
  [[5, 12], [5, 13], [5, 14], [6, 14], [7, 14]],
  [[7, 8], [6, 8], [5, 8], [5, 9], [5, 10], [6, 10], [7, 10]],
];

/** Eyes, a nostril and the hooves, each its own little stroke. */
const DETAILS: [number, number][][] = [
  [
    [4, 6],
    [4, 7],
  ],
  [[6, 9]],
  [
    [3, 14],
    [4, 14],
  ],
];

const keyAt = (grid: readonly string[], cell: number) =>
  grid[Math.floor(cell / SIZE)]![cell % SIZE]!;

/**
 * The pig's inside, from where the bucket lands, ring by ring. Eyes, nostrils
 * and hooves are inside too but stay empty, left for the details.
 */
function fillRings(grid: readonly string[], seed: number): number[][] {
  const inside = (cell: number) => "bk".includes(keyAt(grid, cell));
  const rings: number[][] = [];
  const seen = new Set([seed]);
  let ring = [seed];
  while (ring.length) {
    rings.push(ring.filter((cell) => keyAt(grid, cell) === "b"));
    const next: number[] = [];
    for (const cell of ring) {
      const x = cell % SIZE;
      for (const n of [
        x > 0 ? cell - 1 : -1,
        x < SIZE - 1 ? cell + 1 : -1,
        cell - SIZE,
        cell + SIZE,
      ])
        if (n >= 0 && n < SIZE * SIZE && !seen.has(n) && inside(n)) {
          seen.add(n);
          next.push(n);
        }
    }
    ring = next;
  }
  return rings;
}

export function buildDrawScript(grid: readonly string[] = PIG): DrawScript {
  const waypoints: Waypoint[] = [];
  const actions: Action[] = [];
  let t = 0;

  const go = (target: Target, duration: number, ease: Waypoint["ease"]) => {
    t += duration;
    waypoints.push({ at: t, target, ease });
  };
  const paint = (cell: number, color: string) => {
    actions.push({ at: t, type: "paint", cell, color });
    const mirror = mirrorOf(cell);
    if (mirror !== cell)
      actions.push({
        at: t,
        type: "paint",
        cell: mirror,
        color,
        mirrored: true,
      });
  };
  const stroke = (cells: [number, number][], color: string) =>
    cells.forEach(([x, y], index) => {
      go({ cell: [x, y] }, index ? STEP : NEAR, index ? "line" : "glide");
      paint(cellOf(x, y), color);
    });
  const press = (target: Target) => {
    actions.push({ at: t, type: "press", target });
    t += PRESS;
  };
  const pick = (ui: string, action: Action, distance = FAR) => {
    go({ ui }, distance, "glide");
    actions.push({ ...action, at: t });
    press({ ui });
  };
  const fill = (x: number, y: number, color: string) => {
    go({ cell: [x, y] }, FAR, "glide");
    const start = t;
    press({ cell: [x, y] });
    const rings = fillRings(grid, cellOf(x, y));
    rings.forEach((ring, index) =>
      ring.forEach((cell) =>
        actions.push({
          at: start + index * FILL_RING,
          type: "paint",
          cell,
          color,
        }),
      ),
    );
    t = Math.max(t, start + rings.length * FILL_RING);
  };

  waypoints.push({ at: 0, target: { cell: [18, 13] }, ease: "glide" });
  actions.push({ at: 0, type: "tool", tool: "pencil" });
  actions.push({ at: 0, type: "color", color: PIG_COLORS.r });

  t += 160;
  for (const cells of OUTLINE) stroke(cells, PIG_COLORS.r);

  pick("color-b", { at: 0, type: "color", color: PIG_COLORS.b });
  pick("tool-bucket", { at: 0, type: "tool", tool: "bucket" }, DOCK);
  fill(7, 5, PIG_COLORS.b);
  fill(7, 9, PIG_COLORS.b);

  pick("color-k", { at: 0, type: "color", color: PIG_COLORS.k });
  pick("tool-pencil", { at: 0, type: "tool", tool: "pencil" }, DOCK);
  for (const cells of DETAILS) stroke(cells, PIG_COLORS.k);

  go({ cell: [18, 12] }, FAR, "glide");
  actions.sort((p, q) => p.at - q.at);
  return { waypoints, actions, duration: t + 300 };
}

/** The finished drawing: what the grid holds once every action has run. */
export function finalGrid(script: DrawScript): string[] {
  const out: string[] = Array(SIZE * SIZE).fill("");
  for (const action of script.actions)
    if (action.type === "paint") out[action.cell] = action.color;
  return out;
}

/** The pig as colours, for comparing with a drawing. */
export function pigColors(grid: readonly string[] = PIG): string[] {
  return grid.flatMap((row) =>
    [...row].map((key) => PIG_COLORS[key as keyof typeof PIG_COLORS] ?? ""),
  );
}
