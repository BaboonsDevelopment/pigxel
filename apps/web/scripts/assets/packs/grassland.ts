import { anim, still, variants, type PackDef } from "../lib/asset.ts";
import { C } from "../lib/palette.ts";
import {
  art,
  compose,
  disc,
  filled,
  outline,
  paint,
  put,
  random,
  rect,
  sprite,
  times,
} from "../lib/sprite.ts";
import {
  autotile13,
  pattern,
  textured,
  tile,
  type Texture,
} from "../lib/terrain.ts";

const LIME = "#9cdb43";

// ── Ground textures (shared by other packs) ─────────────────────────────────

function grassTexture(seed: number, flowers = false): Texture {
  return textured(
    C.green,
    pattern(seed, (set, rand) => {
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(rand() * 16);
        const y = Math.floor(rand() * 16);
        set(x, y, C.leaf);
        set(x + 1, y - 1, C.leaf);
        set(x + 2, y, C.leaf);
      }
      for (let i = 0; i < 6; i++)
        set(Math.floor(rand() * 16), Math.floor(rand() * 16), LIME);
      if (flowers)
        for (let i = 0; i < 3; i++) {
          const x = Math.floor(rand() * 16);
          const y = Math.floor(rand() * 16);
          set(x, y, i % 2 ? C.yellow : C.white);
          set(x, y + 1, C.leaf);
        }
    }),
  );
}

function dirtTexture(seed: number): Texture {
  return textured(
    C.brown,
    pattern(seed, (set, rand) => {
      for (let i = 0; i < 12; i++)
        set(Math.floor(rand() * 16), Math.floor(rand() * 16), C.bark);
      for (let i = 0; i < 6; i++)
        set(Math.floor(rand() * 16), Math.floor(rand() * 16), C.tan);
      for (let i = 0; i < 2; i++) {
        const x = Math.floor(rand() * 16);
        const y = Math.floor(rand() * 16);
        set(x, y, C.sand);
        set(x + 1, y, C.grey);
        set(x, y + 1, C.grey);
      }
    }),
  );
}

function waterTexture(seed: number): Texture {
  const deep = pattern(seed, (set, rand) => {
    for (let i = 0; i < 8; i++)
      set(Math.floor(rand() * 16), Math.floor(rand() * 16), C.navy);
  });
  const rand = random(seed + 1);
  const waves = times(
    4,
    () => [Math.floor(rand() * 16), Math.floor(rand() * 16)] as const,
  );
  return (x, y, frame) => {
    for (const [wx, wy] of waves) {
      const len = frame === 1 ? 3 : 2;
      const start = wx + (frame === 2 ? 1 : 0);
      const dx = (((x - start) % 16) + 16) % 16;
      if (y === wy && dx < len) return C.cyan;
    }
    return deep(x, y) ?? C.blue;
  };
}

const foam: Texture = (x, y, frame) =>
  (x + y + frame) % 3 === 0 ? C.white : C.cyan;

/** Rows of rounded cobbles; row heights and stone widths both add up to 16. */
function cobbles(
  seed: number,
  colors = {
    stone: C.grey,
    light: C.silver,
    shade: "#6f7f9c",
    mortar: C.slate,
  },
): Texture {
  return textured(
    colors.mortar,
    pattern(seed, (set, rand) => {
      let y0 = 0;
      for (const rowH of [5, 6, 5]) {
        const offset = Math.floor(rand() * 16);
        let x0 = 0;
        while (x0 < 16) {
          const w = Math.min(16 - x0, 4 + Math.floor(rand() * 4));
          const left = 16 - x0 - w < 4 ? 16 - x0 : w;
          for (let y = 1; y < rowH; y++)
            for (let x = 1; x < left; x++) {
              const corner =
                (x === 1 || x === left - 1) && (y === 1 || y === rowH - 1);
              if (corner) continue;
              const top = y === 1 || (x === 1 && y < rowH - 1);
              const bottom = y === rowH - 1 || x === left - 1;
              set(
                offset + x0 + x,
                y0 + y,
                top ? colors.light : bottom ? colors.shade : colors.stone,
              );
            }
          x0 += left;
        }
        y0 += rowH;
      }
    }),
  );
}

const planks = pattern(4, (set, rand) => {
  for (let row = 0; row < 4; row++) {
    const y0 = row * 4;
    for (let x = 0; x < 16; x++) {
      set(x, y0, C.tan);
      set(x, y0 + 1, C.brown);
      set(x, y0 + 2, C.brown);
      set(x, y0 + 3, C.bark);
    }
    const seam = (row * 7 + 3) % 16;
    for (let y = y0; y < y0 + 3; y++) set(seam, y, C.bark);
    set(seam + 1, y0 + 1, C.tan);
    for (let i = 0; i < 2; i++) {
      const gx = Math.floor(rand() * 13);
      const gy = y0 + 1 + Math.floor(rand() * 2);
      set(gx, gy, "#a0614a");
      set(gx + 1, gy, "#a0614a");
      set(gx + 2, gy, "#a0614a");
    }
    set(seam + 2, y0 + 1, C.ink);
  }
});

function bricks(x: number, y: number) {
  const row = Math.floor(y / 4);
  const bx = (x + (row % 2 ? 4 : 0)) % 8;
  if (y % 4 === 3 || bx === 7) return C.ink;
  if (y % 4 === 0) return C.orange;
  if (bx === 6 || y % 4 === 2) return C.wine;
  return C.rust;
}

function wallTop(x: number, y: number) {
  const row = Math.floor(y / 8);
  const bx = (x + (row % 2 ? 8 : 0)) % 16;
  if (y % 8 === 7 || bx === 15) return C.steel;
  if (y % 8 === 0 || bx === 0) return C.silver;
  if (y % 8 === 6 || bx === 14) return C.slate;
  return C.grey;
}

// ── Props ───────────────────────────────────────────────────────────────────

function foliage(
  w: number,
  h: number,
  blobs: [number, number, number][],
  seed: number,
) {
  const s = sprite(w, h);
  for (const [x, y, r] of blobs) disc(s, x, y, r, C.leaf);
  const top = Math.min(...blobs.map(([, y, r]) => y - r));
  const bottom = Math.max(...blobs.map(([, y, r]) => y + r));
  const mid = (top + bottom) / 2;
  paint(s, C.green, (x, y) => (x - w / 2) * 0.6 + (y - mid) < -2);
  paint(s, C.forest, (x, y) => (x - w / 2) * 0.6 + (y - mid) > 3);
  const rand = random(seed);
  for (let i = 0; i < (w * h) / 14; i++) {
    const x = Math.floor(rand() * w);
    const y = Math.floor(rand() * h);
    if (filled(s, x, y) && filled(s, x + 1, y) && filled(s, x, y + 1)) {
      const lit = (x - w / 2) * 0.6 + (y - mid) < 0;
      put(s, x, y, lit ? LIME : C.leaf);
      put(s, x + 1, y + 1, lit ? C.green : C.forest);
    }
  }
  return outline(s, C.pine);
}

function tree() {
  const trunk = sprite(16, 32);
  rect(trunk, 6, 18, 4, 11, C.brown);
  rect(trunk, 9, 18, 1, 11, C.bark);
  rect(trunk, 6, 18, 1, 11, C.tan);
  rect(trunk, 5, 28, 6, 2, C.brown);
  put(trunk, 4, 29, C.bark);
  put(trunk, 11, 29, C.bark);
  put(trunk, 8, 23, C.bark);
  put(trunk, 7, 25, C.bark);
  const canopy = foliage(
    16,
    24,
    [
      [8, 7, 6.5],
      [4, 13, 3.5],
      [11.5, 13, 3.5],
      [8, 15, 5],
      [8, 10, 6.5],
    ],
    7,
  );
  const shadow = sprite(16, 32);
  rect(shadow, 3, 30, 10, 1, "#18142566");
  return compose(16, 32, [shadow], [outline(trunk, C.ink)], [canopy, 0, 0]);
}

function bush() {
  const s = foliage(
    16,
    16,
    [
      [8, 9, 5.5],
      [4.5, 11, 3.5],
      [11.5, 11, 3.5],
    ],
    3,
  );
  for (const [x, y] of [
    [5, 8],
    [10, 10],
    [7, 12],
  ] as const) {
    put(s, x, y, C.red);
    put(s, x, y - 1, C.rose);
  }
  rect(s, 2, 15, 12, 1, "#18142555");
  return s;
}

const flowerArt = `
  ................
  ................
  ................
  ........pp......
  .......pccp.....
  ...pp...pp......
  ..pccp...g..pp..
  ...pp...g..pccp.
  ....g...g...pp..
  ....g..g....g...
  .....g.g...g....
  .....gGg..gg....
  ...GGgGgGgGgG...
  ..GgGGgGGGgGGG..
  ...GGGGGGGGGG...
  ................
`;
const flowers = (petal: string, centre: string) =>
  outline(
    art(flowerArt, { p: petal, c: centre, g: C.leaf, G: C.green }),
    C.pine,
  );

const rock = art(
  `
  ................
  ................
  ................
  ................
  ................
  .......kkkk.....
  .....kkllggk....
  ....kllgggggk...
  ...klgggggdgdk..
  ..kkgggggddgddk.
  .klgggdgggggddk.
  .kgggggggggdddk.
  kmgggggggdddddk.
  kmmgddddddddddmk
  kkmmmkkkkkkmmmkk
  ................
  `,
  { k: C.night, g: C.grey, l: C.silver, d: C.slate, m: C.leaf },
);

const mushroom = art(
  `
  ................
  ................
  ................
  .....kkkkkk.....
  ...kkrrwwrrkk...
  ..krrrrwwrrrrk..
  .krwwrrrrrrwwdk.
  .krwwrrrrrrwwdk.
  krrrrrrwwrrrrddk
  kdrrrrrwwrrrdddk
  .kkddddddddddkk.
  .....kssstk.....
  .....kssstk.....
  ....kssssttk....
  ....kssssttk....
  .....kkkkkk.....
  `,
  { k: C.ink, r: C.red, d: C.wine, w: C.white, s: C.sand, t: C.tan },
);

function fencePost() {
  const s = sprite(16, 16);
  rect(s, 6, 3, 4, 11, C.brown);
  rect(s, 9, 3, 1, 11, C.bark);
  rect(s, 6, 3, 4, 1, C.tan);
  return s;
}

function fenceRails(from: number, to: number) {
  const s = sprite(16, 16);
  for (const y of [6, 10]) {
    rect(s, from, y, to - from, 2, C.brown);
    rect(s, from, y, to - from, 1, C.tan);
  }
  return s;
}

function fence(kind: "horizontal" | "post" | "corner") {
  const parts =
    kind === "horizontal"
      ? [fenceRails(0, 16), fencePost()]
      : kind === "post"
        ? [fencePost()]
        : [fenceRails(8, 16), fencePost()];
  const s = compose(16, 16, ...parts.map((p) => [p] as [typeof p]));
  if (kind === "corner") {
    rect(s, 7, 14, 2, 2, C.brown);
    put(s, 8, 14, C.bark);
  }
  const out = outline(s, C.ink);
  rect(out, 0, 0, 16, 1, null);
  if (kind !== "post") rect(out, 4, 15, 8, 1, null);
  if (kind === "corner") {
    put(out, 6, 15, C.ink);
    put(out, 9, 15, C.ink);
  }
  return out;
}

const sign = art(
  `
  ................
  ................
  .kkkkkkkkkkkkkk.
  .kllllllllllllk.
  .kwwwwwwwwwwwdk.
  .kwbbbwbbbbwwdk.
  .kwwwwwwwwwwwdk.
  .kwbbbbwbbbwwdk.
  .kwwwwwwwwwwwdk.
  .kddddddddddddk.
  .kkkkkkwdkkkkkk.
  ......kwdk......
  ......kwdk......
  ......kwdk......
  .....kkwdkk.....
  ....kGGGGGGk....
  `,
  { k: C.ink, l: C.tan, w: C.brown, d: C.bark, b: C.ink, G: C.leaf },
);

// ── Pack ────────────────────────────────────────────────────────────────────

const path = autotile13({
  inside: dirtTexture(11),
  outside: grassTexture(21),
  edgeInside: () => C.bark,
  edgeOutside: () => C.leaf,
});

const water = autotile13(
  {
    inside: waterTexture(31),
    outside: grassTexture(21),
    edgeInside: foam,
    edgeOutside: () => C.forest,
  },
  3,
);

export const GRASSLAND: PackDef = {
  id: "grassland-tileset",
  name: "Grassland Tileset",
  tier: "free",
  description:
    "Top-down grass, paths, water, floors and walls, with trees, plants and fences to dress a map.",
  assets: [
    {
      id: "grass-ground",
      name: "Grass ground",
      category: "tiles",
      tags: ["tile", "terrain", "grass", "tileable"],
      clips: variants(
        ["plain", "tufts", "flowers"],
        [
          tile(grassTexture(21)),
          tile(grassTexture(22)),
          tile(grassTexture(23, true)),
        ],
      ),
    },
    {
      id: "dirt-path",
      name: "Dirt path autotile set",
      category: "tiles",
      tags: ["tile", "terrain", "path", "autotile"],
      clips: [still("tiles", path.sheets[0]!)],
      slices: path.slices,
      notes: "13 tiles: the 3×3 block on the left, inner corners on the right.",
    },
    {
      id: "water",
      name: "Water autotile set",
      category: "tiles",
      tags: ["tile", "terrain", "water", "autotile", "animated"],
      clips: [anim("waves", water.sheets, 300)],
      slices: water.slices,
      notes: "13 tiles: the 3×3 block on the left, inner corners on the right.",
    },
    {
      id: "stone-floor",
      name: "Stone floor",
      category: "tiles",
      tags: ["tile", "floor", "stone", "tileable"],
      clips: variants(["a", "b"], [tile(cobbles(5)), tile(cobbles(9))]),
    },
    {
      id: "wooden-planks",
      name: "Wooden planks",
      category: "tiles",
      tags: ["tile", "floor", "wood", "tileable"],
      clips: [
        still(
          "planks",
          tile((x, y) => planks(x, y) ?? C.brown),
        ),
      ],
    },
    {
      id: "brick-wall",
      name: "Brick wall",
      category: "tiles",
      tags: ["tile", "wall", "brick", "tileable"],
      clips: variants(["top", "face"], [tile(wallTop), tile(bricks)]),
    },
    {
      id: "tree",
      name: "Tree",
      category: "nature",
      tags: ["prop", "nature", "tree"],
      clips: [still("tree", tree())],
    },
    {
      id: "bush",
      name: "Bush",
      category: "nature",
      tags: ["prop", "nature"],
      clips: [still("bush", bush())],
    },
    {
      id: "flowers",
      name: "Flowers",
      category: "nature",
      tags: ["prop", "nature", "flower"],
      clips: variants(
        ["red", "yellow"],
        [flowers(C.red, C.yellow), flowers(C.yellow, C.amber)],
      ),
    },
    {
      id: "rock",
      name: "Rock",
      category: "nature",
      tags: ["prop", "nature", "stone"],
      clips: [still("rock", rock)],
    },
    {
      id: "mushroom",
      name: "Mushroom",
      category: "nature",
      tags: ["prop", "nature"],
      clips: [still("mushroom", mushroom)],
    },
    {
      id: "fence",
      name: "Fence",
      category: "nature",
      tags: ["prop", "wood", "fence"],
      clips: variants(
        ["horizontal", "post", "corner"],
        [fence("horizontal"), fence("post"), fence("corner")],
      ),
    },
    {
      id: "sign",
      name: "Sign",
      category: "nature",
      tags: ["prop", "wood"],
      clips: [still("sign", sign)],
    },
  ],
};
