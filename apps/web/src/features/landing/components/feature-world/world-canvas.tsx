"use client";

import { useEffect, useRef } from "react";
import { drawVoxels, project, type View, type Voxel } from "./iso";
import { frameOf, icy, mix, SIZE, type Grid } from "./model";
import styles from "./feature-world.module.css";

/** The island: GX × GY ground tiles, with the pig standing on it. */
const GX = 28;
const GY = 11;
const PIG_X = 0;
/** The pig's flat front, where the drawing shows; her body bulges behind. */
const PIG_Y = 7;
const MAX_DEPTH = 3;

/**
 * How many cubes thick each pixel is: thicker towards the middle of the
 * drawing, so the pig reads as a chunky toy rather than a flat sheet.
 */
function depthOf(grid: Grid): number[] {
  const depth = grid.map((color) => (color ? Infinity : 0));
  const queue: number[] = [];
  grid.forEach((color, cell) => {
    if (!color) return;
    const x = cell % SIZE;
    const y = Math.floor(cell / SIZE);
    const edge =
      x === 0 ||
      y === 0 ||
      x === SIZE - 1 ||
      y === SIZE - 1 ||
      !grid[cell - 1] ||
      !grid[cell + 1] ||
      !grid[cell - SIZE] ||
      !grid[cell + SIZE];
    if (edge) {
      depth[cell] = 1;
      queue.push(cell);
    }
  });
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i]!;
    const x = cell % SIZE;
    for (const next of [
      x > 0 ? cell - 1 : -1,
      x < SIZE - 1 ? cell + 1 : -1,
      cell - SIZE,
      cell + SIZE,
    ])
      if (next >= 0 && next < depth.length && depth[next]! > depth[cell]! + 1) {
        depth[next] = depth[cell]! + 1;
        queue.push(next);
      }
  }
  return depth.map((d) => Math.min(MAX_DEPTH, d));
}

const GROUND = ["#f3eefb", "#ece5f8"];
const TRUNK = "#9b7457";
const LEAVES = ["#8fcf9c", "#7bbf8a"];

function island(): Voxel[] {
  const voxels: Voxel[] = [];
  for (let x = 0; x < GX; x++)
    for (let y = 0; y < GY; y++)
      voxels.push({ x, y, z: -1, color: GROUND[(x + y) % 2]! });
  return voxels;
}

function props(): Voxel[] {
  const voxels: Voxel[] = [];
  const tree = (x: number, y: number, height: number, shade: number) => {
    for (let z = 0; z < height; z++) voxels.push({ x, y, z, color: TRUNK });
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      for (let z = height; z < height + 2; z++)
        voxels.push({ x: x + dx!, y: y + dy!, z, color: LEAVES[shade]! });
    voxels.push({ x, y, z: height + 2, color: LEAVES[shade]! });
  };
  tree(26, 2, 5, 1);
  tree(26, 9, 2, 0);
  tree(17, 1, 4, 0);
  for (const [x, y, color] of [
    [0, 9, "#f3a5bf"],
    [4, 10, "#f5d27a"],
    [11, 9, "#b9a5f0"],
    [16, 10, "#f3a5bf"],
    [21, 10, "#f5d27a"],
    [27, 6, "#b9a5f0"],
  ] as const)
    voxels.push({ x, y, z: 0, color });
  return voxels;
}

const ISLAND = island();
const PROPS = props();

/** The easel beside the pig: an 8 × 8 canvas on three short legs. */
const EASEL_X = 18;
const CANVAS_Z = 4;
const CANVAS = 8;
const PAPER = "#fbf7ef";
const WOOD = "#b98a5e";

/** The flower the pig paints, top row first, one layer per frame. */
// prettier-ignore
const FLOWER = [
  "...pp...",
  "..pyyp..",
  ".pyyyyp.",
  "..pyyp..",
  "...pp...",
  "....g...",
  "..ggggg.",
  "....g...",
];
const PAINT: Record<string, { color: string; frame: number }> = {
  p: { color: "#e86f93", frame: 0 },
  g: { color: "#6fae7c", frame: 1 },
  y: { color: "#f5c84c", frame: 2 },
};
/** The leaves come last, with the finishing touch. */
const isLeaf = (x: number, row: number) => row === 6 && x !== 4;

/** Where the brush tip is in each frame, and what it's painting. */
const BRUSH = [
  { x: 20.5, z: 10, color: PAINT.p!.color },
  { x: 23, z: 5.5, color: PAINT.g!.color },
  { x: 22, z: 9, color: PAINT.y!.color },
  { x: 16.8, z: 6.5, color: PAINT.g!.color },
];

function brushVoxels(frame: number, alpha: number): Voxel[] {
  const tip = BRUSH[frame]!;
  return [
    { x: tip.x, y: PIG_Y + 1, z: tip.z, color: tip.color, alpha, solid: true },
    {
      x: tip.x - 0.7,
      y: PIG_Y + 1,
      z: tip.z - 0.7,
      color: WOOD,
      alpha,
      solid: true,
    },
    {
      x: tip.x - 1.4,
      y: PIG_Y + 1,
      z: tip.z - 1.4,
      color: WOOD,
      alpha,
      solid: true,
    },
  ];
}

/** The easel, its painting as far as `frame`, and the brush. */
function easelVoxels(frame: number, painting: boolean): Voxel[] {
  const voxels: Voxel[] = [];
  for (let z = 0; z < CANVAS_Z; z++) {
    voxels.push({ x: EASEL_X, y: PIG_Y, z, color: WOOD });
    voxels.push({ x: EASEL_X + CANVAS - 1, y: PIG_Y, z, color: WOOD });
  }
  for (let z = 0; z < CANVAS_Z + CANVAS + 1; z++)
    voxels.push({ x: EASEL_X + 3, y: PIG_Y - 2, z, color: WOOD });
  FLOWER.forEach((line, row) => {
    for (let x = 0; x < CANVAS; x++) {
      const paint = PAINT[line[x]!];
      const shown =
        paint &&
        (paint.frame <= frame || !painting) &&
        (!isLeaf(x, row) || frame === 3 || !painting);
      voxels.push({
        x: EASEL_X + x,
        y: PIG_Y,
        z: CANVAS_Z + CANVAS - 1 - row,
        color: shown ? paint.color : PAPER,
      });
    }
  });
  if (painting) {
    voxels.push(...brushVoxels(frame, 1));
    // Onion skin: where the brush was in the two frames before.
    voxels.push(...brushVoxels((frame + 3) % 4, 0.35));
    voxels.push(...brushVoxels((frame + 2) % 4, 0.15));
  }
  return voxels;
}

const FRAME_MS = 600;

const ease = (t: number) => 1 - (1 - t) ** 3;
const clamp = (t: number) => Math.min(1, Math.max(0, t));

export type WorldState = {
  step: number;
  /** When the current step became active (performance.now()). */
  since: number;
  grid: Grid;
  /** When each grid cell was last painted, for the little pop. */
  edits: Map<number, number>;
  reducedMotion: boolean;
};

/** Order the pig assembles in: bottom row first, left to right. */
const BUILD_ORDER = Array.from({ length: SIZE * SIZE }, (_, i) => i).sort(
  (p, q) =>
    Math.floor(q / SIZE) - Math.floor(p / SIZE) || (p % SIZE) - (q % SIZE),
);
const BUILD_RANK = new Map(BUILD_ORDER.map((cell, rank) => [cell, rank]));
const BUILD_STAGGER = 5;
const BUILD_DROP = 420;

/** Which of the four painting frames is showing; the last when not animating. */
function animateFrame(state: WorldState, now: number) {
  if (state.step !== 1) return -1;
  if (state.reducedMotion) return 3;
  return Math.floor((now - state.since) / FRAME_MS) % 4;
}

function pigVoxels(state: WorldState, now: number): Voxel[] {
  const { step, reducedMotion } = state;
  const elapsed = reducedMotion ? 1e9 : now - state.since;
  const bob = reducedMotion ? 0 : Math.sin(now / 720) * 0.06;
  const voxels: Voxel[] = [];

  const frame = animateFrame(state, now);
  // She closes her eyes, pleased, on the finishing touch.
  const grid = frame === 3 ? frameOf(state.grid, 2) : state.grid;
  const depth = depthOf(grid);

  // AI: a recolour wave across the pig, held, then back.
  let wave = 0;
  if (step === 2) {
    const t = reducedMotion ? 4.5 : (elapsed / 1000) % 7.4;
    wave =
      t < 3.1
        ? 0
        : t < 4.3
          ? (t - 3.1) / 1.2
          : t < 6.6
            ? 1
            : 1 - (t - 6.6) / 0.8;
  }
  // Export: a scan beam sweeping left to right.
  const beam =
    step === 3 && !reducedMotion
      ? ((elapsed % 2600) / 2600) * (SIZE + 8) - 4
      : -99;

  for (let cell = 0; cell < SIZE * SIZE; cell++) {
    const color = grid[cell];
    if (!color) continue;
    const px = cell % SIZE;
    const row = Math.floor(cell / SIZE);
    let z = SIZE - 1 - row + bob;
    let alpha = 1;
    let shown = color;
    let solid: boolean | undefined;

    if (step === 0 && !reducedMotion) {
      const local =
        (elapsed - BUILD_RANK.get(cell)! * BUILD_STAGGER) / BUILD_DROP;
      if (local <= 0) continue;
      if (local < 1) {
        z += (1 - ease(local)) * 9;
        alpha = clamp(local * 2.4);
        solid = true;
      }
      const painted = state.edits.get(cell);
      if (painted && now - painted < 260) {
        z += (1 - ease((now - painted) / 260)) * 1.6;
        solid = true;
      }
    }
    if (wave) {
      const amount = clamp(wave * (SIZE + 6) - px - 3);
      shown = mix(color, icy(color), amount);
    }
    if (beam > -99) {
      const d = Math.abs(px - beam);
      if (d < 1.6) {
        const k = 1 - d / 1.6;
        shown = mix(shown, "#ffffff", 0.55 * k);
        z += 0.3 * k;
        solid = true;
      }
    }
    for (let layer = 0; layer < depth[cell]!; layer++)
      voxels.push({
        x: PIG_X + px,
        y: PIG_Y - layer,
        z,
        color: shown,
        alpha,
        solid,
      });
  }

  return voxels;
}

type Sparkle = {
  x: number;
  speed: number;
  size: number;
  color: string;
  phase: number;
};
const SPARKLES: Sparkle[] = Array.from({ length: 10 }, (_, i) => ({
  x: ((i * 37) % 100) / 100,
  speed: 0.5 + ((i * 13) % 7) / 10,
  size: 3 + (i % 3),
  color: ["#f3a5bf", "#b9a5f0", "#f5d27a", "#8fcf9c"][i % 4]!,
  phase: ((i * 53) % 100) / 100,
}));

export function WorldCanvas({ state }: { state: React.RefObject<WorldState> }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvas.current;
    const ctx = node?.getContext("2d");
    if (!node || !ctx) return;
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = false;

    const resize = () => {
      const box = node.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = box.width;
      height = box.height;
      node.width = Math.round(width * ratio);
      node.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      const current = state.current;
      ctx.clearRect(0, 0, width, height);
      // The world is about 33.5 cubes wide and 20.5 tall; keep the top clear
      // for the stat cards.
      const top = 72;
      const a = Math.min((width * 0.92) / 33.5, (height - top) / 20.5);
      const view: View = {
        a,
        // A little right of centre, clear of the cards on the left.
        ox: (width - 33.5 * a) / 2 + width * 0.04,
        oy: top + (height - top - 20.5 * a) / 2 + 19 * a,
        front: GY,
      };

      drawVoxels(ctx, ISLAND, view);

      // A soft shadow under the pig.
      const [sx, sy] = project(view, PIG_X + SIZE / 2, PIG_Y - 0.5, 0);
      const shadow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9 * a);
      shadow.addColorStop(0, "rgb(70 40 110 / 0.16)");
      shadow.addColorStop(1, "rgb(70 40 110 / 0)");
      ctx.fillStyle = shadow;
      ctx.beginPath();
      ctx.ellipse(sx, sy, 9 * a, 1.8 * a, 0, 0, Math.PI * 2);
      ctx.fill();

      const frame = animateFrame(current, now);
      drawVoxels(
        ctx,
        [
          ...PROPS,
          ...easelVoxels(Math.max(frame, 0), frame >= 0),
          ...pigVoxels(current, now),
        ],
        view,
      );

      if (!current.reducedMotion)
        for (const s of SPARKLES) {
          const t = ((now / 1000) * s.speed * 0.18 + s.phase) % 1;
          ctx.globalAlpha = Math.sin(t * Math.PI) * 0.8;
          ctx.fillStyle = s.color;
          ctx.fillRect(
            width * (0.12 + s.x * 0.76),
            height * (0.82 - t * 0.7),
            s.size,
            s.size,
          );
        }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      draw(now);
      if (visible && !state.current.reducedMotion)
        frame = requestAnimationFrame(loop);
    };

    const start = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(loop);
    };

    resize();
    const resizer = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    resizer.observe(node);
    const watcher = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting);
      if (visible) start();
      else cancelAnimationFrame(frame);
    });
    watcher.observe(node);
    // Static redraws (reduced motion, or edits) ask for a frame.
    const redraw = () => start();
    node.addEventListener("pigxel:redraw", redraw);
    return () => {
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      node.removeEventListener("pigxel:redraw", redraw);
    };
  }, [state]);

  return <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />;
}

/** Asks the canvas for a fresh frame when nothing is animating. */
export function requestRedraw(root: HTMLElement | null) {
  root?.querySelector("canvas")?.dispatchEvent(new Event("pigxel:redraw"));
}
