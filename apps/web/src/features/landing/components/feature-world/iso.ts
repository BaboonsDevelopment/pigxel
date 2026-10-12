import { mix } from "./model";

/** One cube of the world, in grid units: x right, y towards the viewer, z up. */
export type Voxel = {
  x: number;
  y: number;
  z: number;
  color: string;
  alpha?: number;
  /** Draw only the face toward the viewer, like a sheet of paper. */
  flat?: boolean;
  /** Animating cubes draw every face, since neighbours may be missing. */
  solid?: boolean;
};

/**
 * An oblique view: the front of every cube faces the viewer square on, so
 * pixel art reads exactly, and depth recedes up and to the right.
 */
const KX = 0.5;
const KY = 0.36;

export type View = {
  /** One cube's width in pixels. */
  a: number;
  /** Where the front-left-bottom corner of the world (0, front, 0) lands. */
  ox: number;
  oy: number;
  /** The y of the world's front edge. */
  front: number;
};

export const project = (
  { a, ox, oy, front }: View,
  x: number,
  y: number,
  z: number,
) =>
  [
    ox + x * a + (front - y) * a * KX,
    oy - z * a - (front - y) * a * KY,
  ] as const;

const key = (x: number, y: number, z: number) => `${x},${y},${z}`;

const shades = new Map<string, [string, string, string]>();
function shadesOf(color: string): [string, string, string] {
  let value = shades.get(color);
  if (!value) {
    value = [mix(color, "#ffffff", 0.2), color, mix(color, "#1e1430", 0.2)];
    shades.set(color, value);
  }
  return value;
}

export function drawVoxels(
  ctx: CanvasRenderingContext2D,
  voxels: Voxel[],
  view: View,
) {
  const filled = new Set<string>();
  for (const v of voxels)
    if (
      v.solid !== true &&
      (v.alpha ?? 1) >= 1 &&
      !v.flat &&
      Number.isInteger(v.z)
    )
      filled.add(key(v.x, v.y, v.z));

  const face = (points: [number, number, number][], color: string) => {
    ctx.beginPath();
    points.forEach(([x, y, z], i) => {
      const [sx, sy] = project(view, x, y, z);
      if (i) ctx.lineTo(sx, sy);
      else ctx.moveTo(sx, sy);
    });
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.fill();
    ctx.stroke();
  };

  // Far to near, bottom to top, left to right.
  const sorted = [...voxels].sort(
    (p, q) => p.y - q.y || p.z - q.z || p.x - q.x,
  );
  ctx.lineWidth = 0.6;
  ctx.lineJoin = "round";
  for (const v of sorted) {
    const { x, y, z } = v;
    const [top, front, side] = shadesOf(v.color);
    ctx.globalAlpha = v.alpha ?? 1;
    const frontFace: [number, number, number][] = [
      [x, y + 1, z],
      [x + 1, y + 1, z],
      [x + 1, y + 1, z + 1],
      [x, y + 1, z + 1],
    ];
    if (v.flat) {
      face(frontFace, front);
      continue;
    }
    const culled = v.solid !== true;
    if (!(culled && filled.has(key(x + 1, y, z))))
      face(
        [
          [x + 1, y + 1, z],
          [x + 1, y, z],
          [x + 1, y, z + 1],
          [x + 1, y + 1, z + 1],
        ],
        side,
      );
    if (!(culled && filled.has(key(x, y, z + 1))))
      face(
        [
          [x, y + 1, z + 1],
          [x + 1, y + 1, z + 1],
          [x + 1, y, z + 1],
          [x, y, z + 1],
        ],
        top,
      );
    if (!(culled && filled.has(key(x, y + 1, z)))) face(frontFace, front);
  }
  ctx.globalAlpha = 1;
}
