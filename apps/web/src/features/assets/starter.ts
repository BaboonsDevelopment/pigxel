import { createLayer } from "@/lib/layers/tree";
import type { PigxelDocument } from "@/lib/pigxel-file/format";
import { createFrame } from "@/lib/sprite/frames";
import type { AssetCategory } from "./assets";

type StarterAsset = {
  id: string;
  name: string;
  category: AssetCategory;
  colors: Record<string, string>;
  frames: string[][];
  duration?: number;
};

const art = (text: string) =>
  text
    .trim()
    .split("\n")
    .map((row) => row.trim());

export const STARTER_ASSETS: StarterAsset[] = [
  {
    id: "slime",
    name: "Slime",
    category: "characters",
    colors: {
      k: "#1e3a29",
      g: "#63c74d",
      d: "#3e8948",
      l: "#a7f070",
      w: "#ffffff",
      e: "#1a1c2c",
    },
    duration: 220,
    frames: [
      art(`
        ................
        ................
        ................
        ................
        ................
        ......kkkk......
        ....kkllggkk....
        ...klwlggggdk...
        ..klwggggggggk..
        ..kgggeggeggdk..
        .kggggeggegggdk.
        .kggggggggggggdk
        .kggggggggggggdk
        .kdgggggggggdddk
        ..kddddddddddk..
        ...kkkkkkkkkk...
      `),
      art(`
        ................
        ................
        ................
        ................
        ................
        ................
        ................
        ......kkkk......
        ...kkkllggkkk...
        ..klwlggggggdk..
        .klwggeggeggggk.
        .kggggeggegggdk.
        kgggggggggggggdk
        kdggggggggggdddk
        .kdddddddddddk..
        ..kkkkkkkkkkkk..
      `),
    ],
  },
  {
    id: "ghost",
    name: "Ghost",
    category: "characters",
    colors: {
      k: "#3a4466",
      w: "#f4f4f4",
      s: "#c0cbdc",
      e: "#1a1c2c",
      p: "#f6757a",
    },
    frames: [
      art(`
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
        ..kssswwsssssk..
        ..kskksskksssk..
        ..kk..kk..kkk...
      `),
    ],
  },
  {
    id: "pig",
    name: "Pig",
    category: "characters",
    colors: {
      k: "#5d275d",
      p: "#f6a6c0",
      d: "#d8709b",
      l: "#ffd6e2",
      n: "#eb6f9a",
      e: "#1a1c2c",
      w: "#ffffff",
    },
    frames: [
      art(`
        ................
        ................
        ..kk........kk..
        .kdpk......kpdk.
        .kddkkkkkkkkddk.
        .kdplllppppppdk.
        .kplpppppppppdk.
        kpppewppppewpppk
        kpppeeppppeepppk
        kppppkkkkkkppppk
        kpppknnnnnnkpppk
        kpppknknnknkpppk
        kppppknnnnkppppk
        .kdppkkkkkkppdk.
        ..kddpppppppddk.
        ...kkkkkkkkkkk..
      `),
    ],
  },
  {
    id: "bat",
    name: "Bat",
    category: "characters",
    colors: {
      k: "#181425",
      b: "#5a6988",
      d: "#3a4466",
      r: "#e43b44",
      w: "#ffffff",
    },
    duration: 160,
    frames: [
      art(`
        ................
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
      `),
      art(`
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
      `),
    ],
  },

  {
    id: "coin",
    name: "Coin",
    category: "items",
    colors: {
      k: "#8a4b08",
      y: "#f5b41a",
      o: "#d98a0b",
      w: "#fff1b8",
      e: "#b86a08",
    },
    duration: 120,
    frames: [
      art(`
        ................
        ................
        ......kkkk......
        ....kkyyyykk....
        ...kywwyyyyok...
        ...kwyyeeyyok...
        ..kwyyyeeyyyok..
        ..kyyyyeeyyyok..
        ..kyyyyeeyyyok..
        ..kyyyyeeyyyok..
        ...kyyyeeyyok...
        ...kyyyyyyook...
        ....kkooookk....
        ......kkkk......
        ................
        ................
      `),
      art(`
        ................
        ................
        ......kkkk......
        .....kyyyyk.....
        ....kwyyyyok....
        ....kwyeyyok....
        ....kyyeyyok....
        ....kyyeyyok....
        ....kyyeyyok....
        ....kyyeyyok....
        ....kyyeyyok....
        ....kyyyyook....
        .....kooook.....
        ......kkkk......
        ................
        ................
      `),
      art(`
        ................
        ................
        .......kk.......
        ......kwok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kyok......
        ......kook......
        .......kk.......
        ................
        ................
      `),
      art(`
        ................
        ................
        ......kkkk......
        .....kyyyyk.....
        ....koyyyywk....
        ....koyyeywk....
        ....koyyeyyk....
        ....koyyeyyk....
        ....koyyeyyk....
        ....koyyeyyk....
        ....koyyeyyk....
        ....kooyyyyk....
        .....kooook.....
        ......kkkk......
        ................
        ................
      `),
    ],
  },
  {
    id: "heart",
    name: "Heart",
    category: "items",
    colors: {
      k: "#3e2731",
      r: "#e43b44",
      d: "#a22633",
      p: "#f6757a",
      w: "#ffffff",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "potion",
    name: "Potion",
    category: "items",
    colors: {
      k: "#3e2731",
      c: "#b86f50",
      g: "#c0cbdc",
      r: "#e43b44",
      d: "#a22633",
      l: "#f6757a",
      w: "#ffffff",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "key",
    name: "Key",
    category: "items",
    colors: {
      k: "#733e39",
      y: "#feae34",
      o: "#d77643",
      w: "#fee761",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "sword",
    name: "Sword",
    category: "items",
    colors: {
      k: "#181425",
      s: "#c0cbdc",
      w: "#ffffff",
      g: "#8b9bb4",
      y: "#feae34",
      o: "#b86f50",
      h: "#733e39",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "gem",
    name: "Gem",
    category: "items",
    colors: {
      k: "#124e89",
      b: "#0099db",
      l: "#2ce8f5",
      w: "#ffffff",
      d: "#124e89",
      m: "#3b5dc9",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "chest",
    name: "Chest",
    category: "items",
    colors: {
      k: "#3e2731",
      w: "#b86f50",
      d: "#733e39",
      l: "#e4a672",
      y: "#feae34",
      o: "#d77643",
    },
    frames: [
      art(`
        ................
        ................
        ................
        ..kkkkkkkkkkkk..
        .klllllllllllwk.
        .kwwwwwwwwwwwdk.
        .kwwwwwwwwwwwdk.
        .kyyyyykkyyyyyk.
        .kdddddkykdddok.
        .kwwwwwkykwwwdk.
        .kwwwwwwkwwwwdk.
        .kwwwwwwwwwwwdk.
        .kwwwwwwwwwwwdk.
        .kyyyyyyyyyyyok.
        .kkkkkkkkkkkkkk.
        ................
      `),
    ],
  },

  {
    id: "tree",
    name: "Tree",
    category: "nature",
    colors: {
      k: "#193c3e",
      g: "#3e8948",
      d: "#265c42",
      l: "#63c74d",
      t: "#733e39",
      b: "#3e2731",
    },
    frames: [
      art(`
        ......kkkk......
        ....kkllggkk....
        ...kllggggggk...
        ..klggglgggddk..
        ..kllgggggggdk..
        .klgggggggggddk.
        .kgggglgggggddk.
        .klgggggggddddk.
        .kggggggggdgddk.
        ..kdgggddgddddk.
        ..kkddddddddkk..
        ....kkkttkkk....
        ......ktbk......
        ......ktbk......
        .....kttbbk.....
        .....kkkkkk.....
      `),
    ],
  },
  {
    id: "flower",
    name: "Flower",
    category: "nature",
    colors: {
      k: "#3e2731",
      p: "#f6757a",
      d: "#e43b44",
      y: "#fee761",
      o: "#feae34",
      w: "#ffffff",
      g: "#63c74d",
      n: "#3e8948",
    },
    frames: [
      art(`
        ................
        ......kkkk......
        .....kppppk.....
        .....kpppdk.....
        ..kkkkpppdkkkk..
        .kppppkkkkppppk.
        .kpppkwyyykpddk.
        .kpppkyyyokpddk.
        .kppppkkkkpdddk.
        ..kkkkpppdkkkk..
        .....kpdddk.....
        ......kgk.......
        ..kkk.kgk.kkk...
        .kggnkkgkknggk..
        ..kkkkkgkkkkk...
        ......kgk.......
      `),
    ],
  },
  {
    id: "mushroom",
    name: "Mushroom",
    category: "nature",
    colors: {
      k: "#3e2731",
      r: "#e43b44",
      d: "#a22633",
      w: "#ffffff",
      s: "#ead4aa",
      t: "#e4a672",
    },
    frames: [
      art(`
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
      `),
    ],
  },
  {
    id: "rock",
    name: "Rock",
    category: "nature",
    colors: {
      k: "#262b44",
      g: "#8b9bb4",
      l: "#c0cbdc",
      d: "#5a6988",
      m: "#63c74d",
    },
    frames: [
      art(`
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
      `),
    ],
  },

  {
    id: "grass",
    name: "Grass",
    category: "tiles",
    colors: {
      g: "#63c74d",
      d: "#3e8948",
      l: "#a7f070",
    },
    frames: [
      art(`
        gggggggggggggggg
        gggdgggggggglggg
        ggdlggggggggdggg
        gggggggggggggggg
        gggggggdgggggggg
        ggggggdlgggggggg
        gggggggggggggdgg
        glgggggggggggdlg
        dggggggggggggggg
        gggggggggdgggggg
        ggggdgggglgggggg
        gggdlggggggggggg
        gggggggggggggdgg
        ggggggggggggdlgg
        gggggglggggggggg
        ggggggdggggggggg
      `),
    ],
  },
  {
    id: "dirt",
    name: "Dirt",
    category: "tiles",
    colors: {
      b: "#b86f50",
      d: "#733e39",
      l: "#e4a672",
      s: "#3e2731",
    },
    frames: [
      art(`
        bbbbbbbbbbbbbbbb
        bbbdbbbbbblbbbbb
        bbbbbbbbbbbbbbdb
        bblbbbbdbbbbbbbb
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbbdbbbb
        bbbdbbblbbbbbbbb
        bbbbbbbbbbbbblbb
        blbbbbbbbbbbbbbb
        bbbbbbbbbdbbbbbb
        bbbbbdbbbbbbbbbb
        bbbbbbbbbbbblbbb
        bbdbbbbbbbbbbbbb
        bbbbbbblbbbbbbdb
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbdbbbbb
      `),
    ],
  },
  {
    id: "bricks",
    name: "Stone bricks",
    category: "tiles",
    colors: {
      g: "#8b9bb4",
      l: "#c0cbdc",
      d: "#5a6988",
      k: "#3a4466",
    },
    frames: [
      art(`
        llllllldllllllld
        ggggggkdggggggkd
        ggggggkdgggggdkd
        dddddddkdddddddk
        llldllllllldllll
        ggkdggggggkdgggg
        ggkdggggdgkdgggg
        dddkdddddddkdddd
        llllllldllllllld
        ggggggkdggggggkd
        ggdgggkdggggggkd
        dddddddkdddddddk
        llldllllllldllll
        ggkdggggggkdgggg
        ggkdgggggdkdgggg
        dddkdddddddkdddd
      `),
    ],
  },
  {
    id: "planks",
    name: "Wood planks",
    category: "tiles",
    colors: {
      w: "#b86f50",
      l: "#e4a672",
      d: "#733e39",
      k: "#3e2731",
    },
    frames: [
      art(`
        lwwdlwwdlwwdlwwd
        lwwdlwwdldwdlwwd
        ldwdlwwdldwdlwwd
        ldwdlwwdlwwdkkkk
        lwwdlwddlwwdlwwd
        lwwdlwddlwwdlwwd
        lwwdlwwdlwwdldwd
        lwwdkkkklwwdldwd
        lwwdlwwdlwwdlwwd
        lwddlwwdlwwdlwwd
        lwddlwwdlwwdlwwd
        lwwdlwwdkkkklwwd
        lwwdldwdlwwdlwdd
        lwwdldwdlwddlwdd
        lwwdlwwdlwddlwwd
        kkkklwwdlwwdlwwd
      `),
    ],
  },
  {
    id: "water",
    name: "Water",
    category: "tiles",
    colors: {
      b: "#0099db",
      d: "#124e89",
      l: "#2ce8f5",
      w: "#ffffff",
    },
    duration: 400,
    frames: [
      art(`
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbbbbbbb
        bbllbbbbbbbbbbbb
        bldllbbbbbbbbbbb
        dbbbdbbbbbbbllbb
        bbbbbbbbbbblddlb
        bbbbbbbbbbdbbbbd
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbbbbbbb
        bbbbbbwlbbbbbbbb
        bbbbbldllbbbbbbb
        bbbbdbbbbdbbbbbb
        bbbbbbbbbbbbbbbb
        lbbbbbbbbbbbbbbl
        llbbbbbbbbbbbbld
        bdbbbbbbbbbbbdbb
      `),
      art(`
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbbbbbbb
        bbbbllbbbbbbbbbb
        bbbldllbbbbbbbbb
        bbdbbbdbbbbbbbll
        lbbbbbbbbbbbbldd
        dbbbbbbbbbbbdbbb
        bbbbbbbbbbbbbbbb
        bbbbbbbbbbbbbbbb
        bbbbbbbbwlbbbbbb
        bbbbbbbldllbbbbb
        bbbbbbdbbbbdbbbb
        bbbbbbbbbbbbbbbb
        bbllbbbbbbbbbbbb
        bldllbbbbbbbbbbb
        dbbbdbbbbbbbbbbb
      `),
    ],
  },
  {
    id: "sand",
    name: "Sand",
    category: "tiles",
    colors: {
      s: "#ead4aa",
      d: "#e4a672",
      l: "#fff1e8",
    },
    frames: [
      art(`
        ssssssssssssssss
        sssdssssssslssss
        ssssssssssssssss
        sssssslssssssdss
        sdssssssssssssss
        sssssssssdssssss
        sssslssssssssssl
        ssssssssssssssss
        ssssssdsssssssss
        slsssssssssldsss
        ssssssssssssssss
        sssdsssssdssssss
        ssssssslssssssss
        ssssssssssssssds
        slssssssssssssss
        sssssssdsssslsss
      `),
    ],
  },
];

const channels = (color: string) =>
  [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));

export function starterPixels(asset: StarterAsset, frame = 0) {
  const rows = asset.frames[frame]!;
  const w = rows[0]!.length;
  const pixels = new Uint8ClampedArray(w * rows.length * 4);
  rows.forEach((row, y) => {
    for (let x = 0; x < w; x++) {
      const color = asset.colors[row[x]!];
      if (color) pixels.set([...channels(color), 255], (y * w + x) * 4);
    }
  });
  return pixels;
}

export function starterDocument(asset: StarterAsset): PigxelDocument {
  const rows = asset.frames[0]!;
  const layer = createLayer("normal", asset.name);
  const frames = asset.frames.map(() => createFrame(asset.duration));
  return {
    id: crypto.randomUUID(),
    width: rows[0]!.length,
    height: rows.length,
    background: "transparent",
    layers: [layer],
    frames,
    cels: new Map(
      frames.map((frame, i) => [
        frame.id,
        new Map([[layer.id, starterPixels(asset, i)]]),
      ]),
    ),
    palette: [...new Set(Object.values(asset.colors))],
    slices: [],
  };
}
