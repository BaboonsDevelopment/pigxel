export const MAX_PALETTE = 256;

export type PalettePreset = {
  id: string;
  name: string;
  colors: string[];
  author?: string;
};

// prettier-ignore
export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "pico-8",
    name: "PICO-8",
    author: "Lexaloffle",
    colors: [
      "#000000", "#1d2b53", "#7e2553", "#008751", "#ab5236", "#5f574f",
      "#c2c3c7", "#fff1e8", "#ff004d", "#ffa300", "#ffec27", "#00e436",
      "#29adff", "#83769c", "#ff77a8", "#ffccaa",
    ],
  },
  {
    id: "sweetie-16",
    name: "Sweetie 16",
    author: "GrafxKid",
    colors: [
      "#1a1c2c", "#5d275d", "#b13e53", "#ef7d57", "#ffcd75", "#a7f070",
      "#38b764", "#257179", "#29366f", "#3b5dc9", "#41a6f6", "#73eff7",
      "#f4f4f4", "#94b0c2", "#566c86", "#333c57",
    ],
  },
  {
    id: "endesga-32",
    name: "Endesga 32",
    author: "ENDESGA",
    colors: [
      "#be4a2f", "#d77643", "#ead4aa", "#e4a672", "#b86f50", "#733e39",
      "#3e2731", "#a22633", "#e43b44", "#f77622", "#feae34", "#fee761",
      "#63c74d", "#3e8948", "#265c42", "#193c3e", "#124e89", "#0099db",
      "#2ce8f5", "#ffffff", "#c0cbdc", "#8b9bb4", "#5a6988", "#3a4466",
      "#262b44", "#181425", "#ff0044", "#68386c", "#b55088", "#f6757a",
      "#e8b796", "#c28569",
    ],
  },
  {
    id: "nintendo-gameboy-bgb",
    name: "Game Boy",
    colors: [
      "#081820", "#346856", "#88c070", "#e0f8d0",
    ],
  },
  {
    id: "kirokaze-gameboy",
    name: "Kirokaze Game Boy",
    author: "Kirokaze",
    colors: [
      "#332c50", "#46878f", "#94e344", "#e2f3e4",
    ],
  },
  {
    id: "hollow",
    name: "Hollow",
    author: "Poltergasm",
    colors: [
      "#0f0f1b", "#565a75", "#c6b7be", "#fafbf6",
    ],
  },
  {
    id: "twilight-5",
    name: "Twilight 5",
    author: "Star",
    colors: [
      "#fbbbad", "#ee8695", "#4a7a96", "#333f58", "#292831",
    ],
  },
  {
    id: "oil-6",
    name: "Oil 6",
    colors: [
      "#fbf5ef", "#f2d3ab", "#c69fa5", "#8b6d9c", "#494d7e", "#272744",
    ],
  },
  {
    id: "slso8",
    name: "SLSO8",
    author: "Luis Miguel Maldonado",
    colors: [
      "#0d2b45", "#203c56", "#544e68", "#8d697a", "#d08159", "#ffaa5e",
      "#ffd4a3", "#ffecd6",
    ],
  },
  {
    id: "ammo-8",
    name: "Ammo-8",
    colors: [
      "#040c06", "#112318", "#1e3a29", "#305d42", "#4d8061", "#89a257",
      "#bedc7f", "#eeffcc",
    ],
  },
  {
    id: "nyx8",
    name: "Nyx8",
    colors: [
      "#08141e", "#0f2a3f", "#20394f", "#f6d6bd", "#c3a38a", "#997577",
      "#816271", "#4e495f",
    ],
  },
  {
    id: "commodore64",
    name: "Commodore 64",
    colors: [
      "#000000", "#626262", "#898989", "#adadad", "#ffffff", "#9f4e44",
      "#cb7e75", "#6d5412", "#a1683c", "#c9d487", "#9ae29b", "#5cab5e",
      "#6abfc6", "#887ecb", "#50459b", "#a057a3",
    ],
  },
  {
    id: "apollo",
    name: "Apollo",
    author: "AdamCYounis",
    colors: [
      "#172038", "#253a5e", "#3c5e8b", "#4f8fba", "#73bed3", "#a4dddb",
      "#19332d", "#25562e", "#468232", "#75a743", "#a8ca58", "#d0da91",
      "#4d2b32", "#7a4841", "#ad7757", "#c09473", "#d7b594", "#e7d5b3",
      "#341c27", "#602c2c", "#884b2b", "#be772b", "#de9e41", "#e8c170",
      "#241527", "#411d31", "#752438", "#a53030", "#cf573c", "#da863e",
      "#1e1d39", "#402751", "#7a367b", "#a23e8c", "#c65197", "#df84a5",
      "#090a14", "#10141f", "#151d28", "#202e37", "#394a50", "#577277",
      "#819796", "#a8b5b2", "#c7cfcc", "#ebede9",
    ],
  },
  {
    id: "resurrect-64",
    name: "Resurrect 64",
    author: "Kerrie Lake",
    colors: [
      "#2e222f", "#3e3546", "#625565", "#966c6c", "#ab947a", "#694f62",
      "#7f708a", "#9babb2", "#c7dcd0", "#ffffff", "#6e2727", "#b33831",
      "#ea4f36", "#f57d4a", "#ae2334", "#e83b3b", "#fb6b1d", "#f79617",
      "#f9c22b", "#7a3045", "#9e4539", "#cd683d", "#e6904e", "#fbb954",
      "#4c3e24", "#676633", "#a2a947", "#d5e04b", "#fbff86", "#165a4c",
      "#239063", "#1ebc73", "#91db69", "#cddf6c", "#313638", "#374e4a",
      "#547e64", "#92a984", "#b2ba90", "#0b5e65", "#0b8a8f", "#0eaf9b",
      "#30e1b9", "#8ff8e2", "#323353", "#484a77", "#4d65b4", "#4d9be6",
      "#8fd3ff", "#45293f", "#6b3e75", "#905ea9", "#a884f3", "#eaaded",
      "#753c54", "#a24b6f", "#cf657f", "#ed8099", "#831c5d", "#c32454",
      "#f04f78", "#f68181", "#fca790", "#fdcbb0",
    ],
  },
];

export const DEFAULT_PALETTE = PALETTE_PRESETS[0]!.colors;

const HEX = /^#[0-9a-f]{6}([0-9a-f]{2})?$/;

export function normalizeColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim().toLowerCase();
  if (!HEX.test(color)) return null;
  return color.endsWith("ff") && color.length === 9 ? color.slice(0, 7) : color;
}

export function readPalette(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const colors = new Set<string>();
  for (const entry of value) {
    const color = normalizeColor(entry);
    if (color) colors.add(color);
    if (colors.size === MAX_PALETTE) break;
  }
  return [...colors];
}

export function colorsOf(pixels: Uint8ClampedArray, max = MAX_PALETTE) {
  const counts = new Map<number, number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (!pixels[i + 3]) continue;
    const key = (pixels[i]! << 16) | (pixels[i + 1]! << 8) | pixels[i + 2]!;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([key]) => `#${key.toString(16).padStart(6, "0")}`);
}

export function pushRecent(recent: string[], color: string, max = 12) {
  return [color, ...recent.filter((c) => c !== color)].slice(0, max);
}
