import { createHash } from "node:crypto";
import { deflateSync } from "fflate";
import type { AssetDef } from "./asset.ts";
import { colorAt, type Sprite } from "./sprite.ts";

const PIGXEL_VERSION = 7;
const VARIANT_MS = 600;
const TAG_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
];

/** Same seed, same id, so regenerating leaves unchanged files byte-identical. */
function stableUuid(seed: string) {
  const hex = createHash("sha256").update(seed).digest("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    "4" + hex.slice(13, 16),
    ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16) + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join("-");
}

type Frames = {
  w: number;
  h: number;
  frames: { sprite: Sprite; ms: number }[];
  tags: {
    name: string;
    from: number;
    to: number;
    direction: string;
    kind: string;
    ms: number;
  }[];
};

export function framesOf(asset: AssetDef): Frames {
  const first = asset.clips[0]!.frames[0]!;
  const frames: Frames["frames"] = [];
  const tags: Frames["tags"] = [];
  for (const clip of asset.clips) {
    const ms = clip.ms ?? (clip.kind === "variant" ? VARIANT_MS : 120);
    for (const frame of clip.frames) {
      if (frame.w !== first.w || frame.h !== first.h)
        throw new Error(
          `${asset.id}/${clip.name}: frame is ${frame.w}×${frame.h}, expected ${first.w}×${first.h}`,
        );
      frames.push({ sprite: frame, ms });
    }
    tags.push({
      name: clip.name,
      from: frames.length - clip.frames.length,
      to: frames.length - 1,
      direction: clip.direction ?? "forward",
      kind: clip.kind,
      ms,
    });
  }
  return { w: first.w, h: first.h, frames, tags };
}

export function paletteOf(sprites: Sprite[]) {
  const colors = new Set<string>();
  for (const s of sprites)
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        const color = colorAt(s, x, y);
        if (color) colors.add(color);
      }
  return [...colors];
}

export function sheetOf({ w, h, frames }: Frames) {
  const sheetW = w * frames.length;
  const data = new Uint8ClampedArray(sheetW * h * 4);
  frames.forEach(({ sprite }, i) => {
    for (let y = 0; y < h; y++)
      data.set(
        sprite.data.subarray(y * w * 4, (y + 1) * w * 4),
        (y * sheetW + i * w) * 4,
      );
  });
  return { w: sheetW, h, data };
}

export function pigxelFile(asset: AssetDef, frames: Frames) {
  const id = (part: string) => stableUuid(`${asset.id}:${part}`);
  const layer = id("layer");
  const frameIds = frames.frames.map((_, i) => id(`frame:${i}`));
  const tagged = frames.frames.length > 1 || asset.clips.length > 1;
  return JSON.stringify({
    format: "pigxel",
    version: PIGXEL_VERSION,
    id: id("document"),
    width: frames.w,
    height: frames.h,
    background: "transparent",
    frames: frames.frames.map(({ ms }, i) => ({
      id: frameIds[i],
      duration: ms,
    })),
    tags: tagged
      ? frames.tags.map((tag, i) => ({
          id: id(`tag:${i}`),
          name: tag.name,
          from: tag.from,
          to: tag.to,
          color: TAG_COLORS[i % TAG_COLORS.length],
          direction: tag.direction,
          repeat: 0,
        }))
      : [],
    links: [],
    celSettings: [],
    layers: [
      {
        id: layer,
        name: asset.name,
        kind: "normal",
        visible: true,
        locked: false,
        opacity: 255,
        blend: "normal",
      },
    ],
    cels: frames.frames.map(({ sprite }, i) => ({
      frame: frameIds[i],
      layer,
      pixels: Buffer.from(
        deflateSync(
          new Uint8Array(
            sprite.data.buffer,
            sprite.data.byteOffset,
            sprite.data.byteLength,
          ),
        ),
      ).toString("base64"),
    })),
    palette: paletteOf(frames.frames.map((f) => f.sprite)),
    slices: (asset.slices ?? []).map((slice, i) => ({
      id: id(`slice:${i}`),
      name: slice.name,
      bounds: { x: slice.x, y: slice.y, w: slice.w, h: slice.h },
      center: slice.border
        ? {
            x: slice.border,
            y: slice.border,
            w: slice.w - 2 * slice.border,
            h: slice.h - 2 * slice.border,
          }
        : null,
      pivot: null,
    })),
  });
}
