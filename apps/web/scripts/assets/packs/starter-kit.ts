import { anim, still, variants, type PackDef } from "../lib/asset.ts";
import { C } from "../lib/palette.ts";
import {
  art,
  compose,
  disc,
  ellipse,
  filled,
  line,
  outline,
  paint,
  polygon,
  put,
  random,
  recolor,
  rect,
  ring,
  shift,
  sprite,
  times,
  type Sprite,
} from "../lib/sprite.ts";

// ── Characters ──────────────────────────────────────────────────────────────

const heroColors = {
  k: C.black,
  h: C.brown,
  H: C.bark,
  s: C.skin,
  S: C.tanSkin,
  e: C.black,
  t: C.blue,
  T: C.navy,
  b: C.bark,
  g: C.gold,
  P: C.steel,
  Q: C.night,
  o: C.ink,
};

const heroHead = art(
  `
  ................
  .....kkkkkk.....
  ....khhhhhhkk...
  ...khhhhhhhhhk..
  ...kHhhhhhhhhhk.
  ...kHhhhhsssssk.
  ...kHHhhssssesk.
  ...kHHhSssssesk.
  ....kHSsssssssk.
  .....kkSSSSSkk..
  `,
  heroColors,
);

const heroTorso = (rows: string) => art(rows, heroColors);
const torso = {
  front: heroTorso(`
    .....kTtttttk...
    ....kTttttTTsk..
    ....kbbbbgbbk...
  `),
  back: heroTorso(`
    .....kTtttttk...
    ...skTtttttTk...
    ....kbbbbgbbk...
  `),
};

const heroLegs = (rows: string) => art(rows, heroColors);
const legs = {
  stand: heroLegs(`
    .....kPPPPPk....
    .....kPkkkPk....
    .....kok.kok....
  `),
  forward: heroLegs(`
    ....kQQkPPk.....
    ...kQk...kPk....
    ...kok....kok...
  `),
  back: heroLegs(`
    ....kPPkQQk.....
    ...kPk...kQk....
    ...kok....kok...
  `),
  pass: heroLegs(`
    .....kQPPk......
    ......kPk.......
    ......kok.......
  `),
};

const hero = (leg: Sprite, arm: Sprite, bob = 0) =>
  compose(16, 16, [leg, 0, 13], [arm, 0, 10], [heroHead, 0, bob]);

function slime(rx: number, ry: number) {
  const s = sprite(16, 16);
  const cx = 7.5;
  const cy = 14 - ry;
  ellipse(s, cx, cy, rx, ry, C.green);
  rect(s, 0, 15, 16, 1, null);
  paint(s, C.leaf, (x, y) => y >= 13 || x >= cx + rx - 1);
  put(s, Math.round(cx - rx + 2), Math.round(cy - ry + 2), C.white);
  put(s, Math.round(cx - rx + 2), Math.round(cy - ry + 3), C.yellow);
  put(s, Math.round(cx - rx + 3), Math.round(cy - ry + 2), C.yellow);
  for (const ex of [cx - 2.5, cx + 1.5]) {
    put(s, ex, cy, C.pine);
    put(s, ex, cy + 1, C.pine);
  }
  return outline(s, C.pine);
}

const ghostColors = {
  k: C.steel,
  w: C.white,
  s: C.silver,
  e: C.black,
  p: C.rose,
};
const ghostBody = `
  ................
  .....kkkkkk.....
  ....kwwwwwwk....
  ...kwwwwwwwwk...
  ..kwwwwwwwwwsk..
  ..kwweewweewsk..
  ..kwweewweewsk..
  ..kwwwwwwwwwsk..
  ..kwpwwwwwwpsk..
  ..kwwwweewwwsk..
  ..kwwwwwwwwwsk..
  ..kwwwwwwwwwsk..
  ..kswwwwwwwssk..
`;
const ghostTails = [
  `
  ..kssswwsssssk..
  ..kskksskksssk..
  ..kk..kk..kkk...
  `,
  `
  ..ksswwssssssk..
  ..ksskssskkssk..
  ...kk..kk...kk..
  `,
];
const ghost = (tail: number, dy: number) =>
  shift(
    art(ghostBody.trimEnd() + "\n" + ghostTails[tail]!, ghostColors),
    0,
    dy,
  );

const batColors = { k: C.black, b: C.slate, d: C.steel, r: C.red, w: C.white };
const batFrames = [
  `
  ................
  ................
  ................
  k.....k..k.....k
  kk....kkkk....kk
  kbk..kbbbbk..kbk
  kbbkkbrbbrbkkbbk
  kbbbbbbbbbbbbbbk
  .kbbdbbwwbbdbbk.
  ..kdkdbbbbdkdk..
  ...k.kdbbdk.k...
  ......kddk......
  .......kk.......
  ................
  ................
  ................
  `,
  `
  ................
  ................
  ................
  ................
  ................
  ......k..k......
  .kkk..kkkk..kkk.
  kbbbkkbbbbkkbbbk
  kbbbbbrbbrbbbbbk
  .kdbbbbwwbbbbdk.
  ..kdkdbbbbdkdk..
  ...k.kdbbdk.k...
  ......kddk......
  .......kk.......
  ................
  ................
  `,
  `
  ................
  ................
  ................
  ................
  ................
  ......k..k......
  ......kkkk......
  .....kbbbbk.....
  ....kbrbbrbk....
  ...kbbbbbbbbk...
  ..kbbbbwwbbbbk..
  .kbbdkdbbdkdbbk.
  kbbdk.kddk.kdbbk
  kbdk...kk...kdbk
  kdk..........kdk
  kk............kk
  `,
].map((frame) => art(frame, batColors));

// ── Items ───────────────────────────────────────────────────────────────────

function coin(rx: number, face: boolean) {
  const s = sprite(16, 16);
  if (rx < 1) {
    rect(s, 7, 2, 2, 12, C.amber);
    rect(s, 7, 3, 1, 10, C.gold);
    return outline(s, C.bark);
  }
  ellipse(s, 7.5, 7.5, rx, 5.5, C.gold);
  paint(s, C.amber, (x) => x > 7.5 + rx - 1.5);
  paint(s, C.yellow, (x, y) => x < 7.5 - rx + 1.5 && y < 10);
  if (face && rx >= 3) {
    ellipse(s, 7.5, 7.5, rx - 2, 3.5, C.amber);
    ellipse(s, 7.5, 7.5, rx - 3, 2.5, C.gold);
    rect(s, 7, 5, 2, 6, C.amber);
    rect(s, 7, 5, 1, 5, C.yellow);
  }
  return outline(s, C.bark);
}

const heartColors = {
  k: C.ink,
  r: C.red,
  d: C.wine,
  p: C.rose,
  w: C.white,
  e: C.night,
  E: C.steel,
};
const heartShape = (fill: (x: number) => "full" | "empty") => {
  const full = art(
    `
    ................
    ................
    ..kkkk....kkkk..
    .kprrrk..krrrrk.
    kpwprrrkkrrrrrdk
    kpwrrrrrrrrrrrdk
    kprrrrrrrrrrrrdk
    krrrrrrrrrrrrrdk
    .krrrrrrrrrrrdk.
    ..krrrrrrrrrdk..
    ...krrrrrrrdk...
    ....krrrrrdk....
    .....krrrdk.....
    ......krdk......
    .......kk.......
    ................
    `,
    heartColors,
  );
  const empty = recolor(full, {
    [C.red]: C.night,
    [C.wine]: C.night,
    [C.rose]: C.steel,
    [C.white]: C.steel,
  });
  const s = sprite(16, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const src = fill(x) === "full" ? full : empty;
      const i = (y * 16 + x) * 4;
      s.data.set(src.data.subarray(i, i + 4), i);
    }
  return s;
};

const potionColors = {
  k: C.ink,
  c: C.brown,
  g: C.silver,
  r: C.red,
  d: C.wine,
  l: C.rose,
  w: C.white,
};
const redPotion = art(
  `
  ................
  ................
  ......kkkk......
  ......kcck......
  .....kkkkkk.....
  ......kggk......
  ......kgwk......
  .....kggwgk.....
  ....kgggggwk....
  ...kwllllllrk...
  ...kwrrrrrrdk...
  ...krrrrrrrdk...
  ...krrrrrrddk...
  ....krrrrddk....
  .....kkkkkk.....
  ................
  `,
  potionColors,
);
const bluePotion = recolor(redPotion, {
  [C.red]: C.blue,
  [C.wine]: C.navy,
  [C.rose]: C.cyan,
});

const key = art(
  `
  ................
  ................
  ................
  ................
  .kkkk...........
  kwyyok..........
  kyk.kokkkkkkkkk.
  kyk.kyywyyyyyyok
  kwyyooooooooook.
  .kkook..kok.kok.
  ....k...kok.kok.
  ........kk..kk..
  ................
  ................
  ................
  ................
  `,
  { k: C.bark, y: C.gold, o: C.orange, w: C.yellow },
);

const sword = art(
  `
  .......kk.......
  ......kwsk......
  ......kwsk......
  ......kwgk......
  ......kwgk......
  ......kwgk......
  ......kwgk......
  ......kwgk......
  ......kwgk......
  ......kwgk......
  ...kkkkwgkkkk...
  ...kyyyyyyyok...
  ...kkkkhhkkkk...
  ......khhk......
  ......kyok......
  .......kk.......
  `,
  {
    k: C.black,
    s: C.silver,
    w: C.white,
    g: C.grey,
    y: C.gold,
    o: C.brown,
    h: C.bark,
  },
);

const shield = art(
  `
  ................
  ..kkkkkkkkkkkk..
  ..kmmmmmmmmmmk..
  ..kmbbbbybbBMk..
  ..kmbbbbybbBMk..
  ..kmbyyyyyyBMk..
  ..kmbbbbybbBMk..
  ..kmbbbbybbBMk..
  ..kmbbbbybbBMk..
  ...kmbbbybBMk...
  ...kmbbbyBBMk...
  ....kmbbyBMk....
  .....kmbBMk.....
  ......kMMk......
  .......kk.......
  ................
  `,
  { k: C.night, m: C.silver, M: C.grey, b: C.blue, B: C.navy, y: C.gold },
);

function bow() {
  const s = sprite(16, 16);
  const c = 2.7;
  const r = 10.3;
  for (let a = -6; a <= 96; a += 0.5) {
    const rad = (a * Math.PI) / 180;
    put(s, c + r * Math.cos(rad), c + r * Math.sin(rad), C.brown);
    put(s, c + (r - 1) * Math.cos(rad), c + (r - 1) * Math.sin(rad), C.bark);
  }
  const strung = outline(s, C.ink);
  line(strung, 12, 2, 2, 12, C.silver);
  for (const [x, y] of [
    [9, 10],
    [10, 9],
    [10, 10],
    [9, 9],
  ] as const)
    put(strung, x, y, C.red);
  return strung;
}

const gem = art(
  `
  ................
  ................
  ................
  ....kkkkkkkk....
  ...klwlllbbmk...
  ..klwllbbbbmmk..
  .kkkkkkkkkkkkkk.
  .klllbbbbbbmmmk.
  ..klllbbbbbmmk..
  ...kllbbbbmmk...
  ....klbbbbmk....
  .....klbbmk.....
  ......kbmk......
  .......kk.......
  ................
  ................
  `,
  { k: C.navy, b: C.blue, l: C.cyan, w: C.white, m: C.steel },
);

const chestColors = {
  k: C.ink,
  w: C.brown,
  d: C.bark,
  l: C.tan,
  y: C.gold,
  o: C.orange,
  i: C.black,
  c: C.yellow,
};
const chestBody = `
  .kwwwwwkykwwwdk.
  .kwwwwwkkkwwwdk.
  .kwwwwwwwwwwwdk.
  .kyyyyyyyyyyyok.
  .kwwwwwwwwwwwdk.
  .kdddddddddddok.
  .kkkkkkkkkkkkkk.
`;
const chestFrames = [
  `
  ................
  ................
  ................
  ..kkkkkkkkkkkk..
  .kllllllllllllk.
  .kwwwwwwwwwwwdk.
  .kwwwwwwwwwwwdk.
  .kyyyyykkyyyyok.
  `,
  `
  ................
  ..kkkkkkkkkkkk..
  .kllllllllllllk.
  .kwwwwwwwwwwwdk.
  .kyyyyyyyyyyyok.
  .kkkkkkkkkkkkkk.
  .kiiiiiiiiiiiik.
  .kkkkkkkiikkkkk.
  `,
  `
  ..kkkkkkkkkkkk..
  .kddddddddddddk.
  .kwwwwwwwwwwwdk.
  .kkkkkkkkkkkkkk.
  .kiiiiiiiiiiiik.
  .kiicyciiyciiik.
  .kicyyycyyycyik.
  .kkkkkkkiikkkkk.
  `,
].map((top) =>
  art(top.trimEnd() + "\n" + chestBody + "\n................", chestColors),
);

const scroll = art(
  `
  ................
  ................
  ..kkkkkkkkkkkk..
  .kTttttttttttTk.
  .kbTTTTTTTTTTbk.
  ..kssssssssssk..
  ..ksllllllsssk..
  ..kssssssssssk..
  ..kslllllsllsk..
  ..kssssssssssk..
  ..ksllllllssrk..
  ..kssssssssrrk..
  .kTttttttttttTk.
  .kbTTTTTTTTTTbk.
  ..kkkkkkkkkkkk..
  ................
  `,
  { k: C.ink, t: C.tan, T: C.brown, b: C.bark, s: C.sand, l: C.tan, r: C.red },
);

// ── UI ──────────────────────────────────────────────────────────────────────

const cursorColors = { k: C.black, w: C.white, s: C.silver };
const pointer = art(
  `
  k...............
  kk..............
  kwk.............
  kwwk............
  kwwwk...........
  kwwwwk..........
  kwwwwwk.........
  kwwwwwsk........
  kwwwwwssk.......
  kwwwwskkkk......
  kwwkwsk.........
  kwk.kwsk........
  kk..kwsk........
  k....kwsk.......
  .....kwsk.......
  ......kk........
  `,
  cursorColors,
);
const hand = art(
  `
  .....kk.........
  ....kwwk........
  ....kwsk........
  ....kwsk........
  ....kwskkk......
  ....kwskwskk....
  .kk.kwskwskwk...
  kwwkkwwwwwwwsk..
  kwswkwwwwwwwsk..
  .kwwwwwwwwwwsk..
  .kwwwwwwwwwwsk..
  ..kwwwwwwwwssk..
  ...kwwwwwwwsk...
  ....kwwwwwsk....
  ....kwwwwwsk....
  ....kkkkkkkk....
  `,
  cursorColors,
);

function panel(
  w: number,
  h: number,
  body: string,
  light: string,
  dark: string,
  edge: string,
  pressed = false,
) {
  const s = sprite(w, h);
  const top = pressed ? 1 : 0;
  const bottom = h - 1;
  rect(s, 1, top, w - 2, bottom - top + 1, edge);
  rect(s, 0, top + 1, w, bottom - top - 1, edge);
  rect(s, 1, top + 1, w - 2, bottom - top - 1, body);
  rect(s, 2, top + 1, w - 4, 1, light);
  rect(s, 1, top + 2, 1, bottom - top - (pressed ? 3 : 4), light);
  if (!pressed) rect(s, 1, bottom - 2, w - 2, 2, dark);
  else rect(s, 1, bottom - 1, w - 2, 1, dark);
  return s;
}

function windowFrame() {
  const s = sprite(24, 24);
  rect(s, 1, 0, 22, 24, C.black);
  rect(s, 0, 1, 24, 22, C.black);
  rect(s, 1, 1, 22, 22, C.slate);
  rect(s, 1, 1, 22, 1, C.grey);
  rect(s, 1, 1, 1, 22, C.grey);
  rect(s, 2, 22, 21, 1, C.steel);
  rect(s, 22, 2, 1, 21, C.steel);
  rect(s, 3, 3, 18, 18, C.black);
  rect(s, 4, 4, 16, 16, C.night);
  rect(s, 4, 4, 16, 1, C.steel);
  for (const [x, y] of [
    [2, 2],
    [21, 2],
    [2, 21],
    [21, 21],
  ] as const) {
    put(s, x, y, C.gold);
  }
  return s;
}

function healthBar(part: "frame" | "fill") {
  const s = sprite(32, 8);
  if (part === "frame") {
    rect(s, 1, 0, 30, 8, C.black);
    rect(s, 0, 1, 32, 6, C.black);
    rect(s, 1, 1, 30, 6, C.grey);
    rect(s, 1, 1, 30, 1, C.silver);
    rect(s, 2, 2, 28, 4, C.night);
    rect(s, 2, 5, 28, 1, C.black);
  } else {
    rect(s, 2, 2, 28, 4, C.red);
    rect(s, 2, 2, 28, 1, C.rose);
    rect(s, 2, 5, 28, 1, C.wine);
  }
  return s;
}

function star(size = 7, inner = 3) {
  const s = sprite(16, 16);
  const pts: [number, number][] = times(10, (i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : size;
    return [8 + r * Math.cos(a), 8.6 + r * Math.sin(a)];
  });
  polygon(s, pts, C.yellow);
  paint(s, C.gold, (x, y) => x + y > 17 || y > 11);
  paint(s, C.white, (x, y) => (x === 7 || x === 8) && y >= 4 && y <= 5);
  return outline(s, C.bark);
}

function checkbox(on: boolean) {
  const s = sprite(16, 16);
  rect(s, 2, 2, 12, 12, C.white);
  rect(s, 2, 12, 12, 2, C.silver);
  rect(s, 12, 2, 2, 12, C.silver);
  const box = outline(s, C.steel);
  if (on) {
    const tick = sprite(16, 16);
    for (const [x, y] of [
      [4, 8],
      [5, 9],
      [6, 10],
      [7, 9],
      [8, 8],
      [9, 7],
      [10, 6],
      [11, 5],
      [12, 4],
    ] as const) {
      rect(tick, x, y, 1, 2, C.green);
    }
    paint(tick, C.leaf, (_, y) => y >= 10);
    return compose(16, 16, [box], [outline(tick, C.forest, true)]);
  }
  return box;
}

// ── Effects ─────────────────────────────────────────────────────────────────

function sparkle(arm: number) {
  const s = sprite(16, 16);
  if (arm > 0) {
    rect(s, 8 - arm, 7, arm * 2, 2, C.yellow);
    rect(s, 7, 8 - arm, 2, arm * 2, C.yellow);
    rect(s, 8 - arm - 1, 7, 1, 2, null);
    rect(s, 8 + arm - 1, 7, 1, 2, null);
    put(s, 8 - arm, 7, C.gold);
    put(s, 8 + arm - 1, 8, C.gold);
    put(s, 7, 8 - arm, C.gold);
    put(s, 8, 8 + arm - 1, C.gold);
    if (arm >= 3)
      for (const [x, y] of [
        [5, 5],
        [10, 5],
        [5, 10],
        [10, 10],
      ] as const)
        put(s, x, y, C.cyan);
  }
  rect(s, 7, 7, 2, 2, C.white);
  return s;
}

function explosion(step: number) {
  const s = sprite(16, 16);
  const rand = random(17 + step);
  const smoke = [C.grey, C.slate, C.steel];
  const radius = [2.5, 4.5, 6, 6.5, 6.5, 5][step]!;
  if (step <= 2) {
    disc(s, 7.5, 7.5, radius, step === 0 ? C.yellow : C.amber);
    if (step >= 1) disc(s, 7.5, 7.5, radius - 1.5, C.gold);
    disc(s, 7.5, 7.5, Math.max(1, radius - 3), step === 2 ? C.yellow : C.white);
    if (step === 2) ring(s, 7.5, 7.5, radius, C.red);
  } else {
    const puffs = step === 3 ? 7 : step === 4 ? 6 : 4;
    for (let i = 0; i < puffs; i++) {
      const a = (i / puffs) * Math.PI * 2 + step;
      const d = radius - 2.5;
      const r = step === 5 ? 1.5 : 2.5;
      disc(
        s,
        7.5 + Math.cos(a) * d,
        7.5 + Math.sin(a) * d,
        r,
        smoke[Math.min(2, step - 3)]!,
      );
    }
    if (step === 3) {
      disc(s, 7.5, 7.5, 3, C.red);
      disc(s, 7.5, 7.5, 1.5, C.amber);
    }
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++)
        if (filled(s, x, y) && rand() < 0.08 * (step - 2)) put(s, x, y, null);
  }
  return s;
}

export const STARTER_KIT: PackDef = {
  id: "pixel-starter-kit",
  name: "Pixel Starter Kit",
  tier: "free",
  description:
    "A hero, four monsters, everyday items, basic UI pieces and two effects, all at 16×16.",
  assets: [
    {
      id: "hero",
      name: "Hero",
      category: "characters",
      tags: ["character", "hero", "animated"],
      clips: [
        anim(
          "idle",
          [0, 0, 1, 1].map((bob) => hero(legs.stand, torso.front, bob)),
          220,
        ),
        anim(
          "walk",
          [
            hero(legs.forward, torso.back),
            hero(legs.pass, torso.front),
            hero(legs.back, torso.front),
            hero(legs.pass, torso.back),
          ],
          140,
        ),
      ],
    },
    {
      id: "slime",
      name: "Slime",
      category: "characters",
      tags: ["character", "monster", "animated"],
      clips: [
        anim("idle", [slime(6, 5), slime(7, 4), slime(6, 5), slime(5, 6)], 180),
      ],
    },
    {
      id: "bat",
      name: "Bat",
      category: "characters",
      tags: ["character", "monster", "flying", "animated"],
      clips: [
        anim(
          "fly",
          [batFrames[0]!, batFrames[1]!, batFrames[2]!, batFrames[1]!],
          110,
        ),
      ],
    },
    {
      id: "ghost",
      name: "Ghost",
      category: "characters",
      tags: ["character", "monster", "animated"],
      clips: [
        anim(
          "float",
          [ghost(0, 0), ghost(1, -1), ghost(0, -1), ghost(1, 0)],
          200,
        ),
      ],
    },
    {
      id: "coin",
      name: "Coin",
      category: "items",
      tags: ["item", "currency", "animated"],
      clips: [
        anim(
          "spin",
          [
            coin(5, true),
            coin(3.5, true),
            coin(1.5, true),
            coin(0, false),
            coin(1.5, false),
            coin(3.5, false),
          ],
          100,
        ),
      ],
    },
    {
      id: "heart",
      name: "Heart",
      category: "items",
      tags: ["item", "ui", "health"],
      clips: variants(
        ["full", "half", "empty"],
        [
          heartShape(() => "full"),
          heartShape((x) => (x < 8 ? "full" : "empty")),
          heartShape(() => "empty"),
        ],
      ),
    },
    {
      id: "key",
      name: "Key",
      category: "items",
      tags: ["item", "quest"],
      clips: [still("key", key)],
    },
    {
      id: "potion",
      name: "Potion",
      category: "items",
      tags: ["item", "potion"],
      clips: variants(["red", "blue"], [redPotion, bluePotion]),
    },
    {
      id: "sword",
      name: "Sword",
      category: "items",
      tags: ["item", "weapon"],
      clips: [still("sword", sword)],
    },
    {
      id: "shield",
      name: "Shield",
      category: "items",
      tags: ["item", "armor"],
      clips: [still("shield", shield)],
    },
    {
      id: "bow",
      name: "Bow",
      category: "items",
      tags: ["item", "weapon"],
      clips: [still("bow", bow())],
    },
    {
      id: "gem",
      name: "Gem",
      category: "items",
      tags: ["item", "treasure"],
      clips: [still("gem", gem)],
    },
    {
      id: "chest",
      name: "Chest",
      category: "items",
      tags: ["item", "treasure", "animated"],
      clips: [still("closed", chestFrames[0]!), anim("open", chestFrames, 120)],
    },
    {
      id: "scroll",
      name: "Scroll",
      category: "items",
      tags: ["item", "magic"],
      clips: [still("scroll", scroll)],
    },
    {
      id: "cursor",
      name: "Cursor",
      category: "items",
      tags: ["ui"],
      clips: variants(["pointer", "hand"], [pointer, hand]),
    },
    {
      id: "button",
      name: "Button",
      category: "items",
      tags: ["ui", "9-slice"],
      clips: variants(
        ["normal", "pressed"],
        [
          panel(16, 16, C.blue, C.cyan, C.navy, C.black),
          panel(16, 16, C.navy, C.blue, C.night, C.black, true),
        ],
      ),
      slices: [{ name: "button", x: 0, y: 0, w: 16, h: 16, border: 4 }],
    },
    {
      id: "window-frame",
      name: "Window frame",
      category: "items",
      tags: ["ui", "9-slice"],
      clips: [still("window", windowFrame())],
      slices: [{ name: "window", x: 0, y: 0, w: 24, h: 24, border: 6 }],
    },
    {
      id: "health-bar",
      name: "Health bar",
      category: "items",
      tags: ["ui", "health"],
      clips: variants(
        ["frame", "fill"],
        [healthBar("frame"), healthBar("fill")],
      ),
      notes:
        "Draw the fill over the frame and crop it from the right to show health.",
    },
    {
      id: "star",
      name: "Star",
      category: "items",
      tags: ["ui", "item"],
      clips: [still("star", star())],
    },
    {
      id: "checkbox",
      name: "Checkbox",
      category: "items",
      tags: ["ui"],
      clips: variants(["off", "on"], [checkbox(false), checkbox(true)]),
    },
    {
      id: "sparkle",
      name: "Sparkle",
      category: "items",
      tags: ["effect", "animated"],
      clips: [
        anim("sparkle", [sparkle(2), sparkle(4), sparkle(6), sparkle(3)], 90),
      ],
    },
    {
      id: "small-explosion",
      name: "Small explosion",
      category: "items",
      tags: ["effect", "animated"],
      clips: [anim("explode", times(6, explosion), 70)],
    },
  ],
};
