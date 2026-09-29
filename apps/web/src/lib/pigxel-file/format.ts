/**
 * The .pigxel file format: UTF-8 JSON with the pixels as base64 RGBA.
 *
 * {
 *   "format": "pigxel",
 *   "version": 1,
 *   "width": 32,
 *   "height": 32,
 *   "background": "white",
 *   "layers": [
 *     { "name": "Layer 1", "visible": true, "opacity": 1, "pixels": "<base64>" }
 *   ]
 * }
 *
 * `pixels` holds width × height × 4 bytes (red, green, blue, alpha), row by
 * row from the top-left. `layers` is listed bottom to top; the editor
 * currently reads and writes a single layer. `background` (optional, default
 * "transparent") is what the eraser paints and what fills a grown canvas. Bump `version` whenever the
 * shape changes, and keep reading older versions.
 */

export const PIGXEL_EXTENSION = ".pigxel";
export const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
const PIGXEL_VERSION = 1;
export const MAX_PIGXEL_SIZE = 256;

const BACKGROUNDS = ["transparent", "white", "black"] as const;
export type Background = (typeof BACKGROUNDS)[number];

/** The colour a background paints, or null for transparent. */
export function backgroundColor(background: Background) {
  return background === "white"
    ? "#ffffff"
    : background === "black"
      ? "#000000"
      : null;
}

/** A single-layer image, in the same layout as the canvas ImageData. */
export type PigxelImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  background?: Background;
};

/** A new tile filled with its background. */
export function blankImage(
  width: number,
  height: number,
  background: Background,
): PigxelImage {
  const data = new Uint8ClampedArray(width * height * 4);
  const value = background === "white" ? 255 : 0;
  if (background !== "transparent")
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i + 1] = data[i + 2] = value;
      data[i + 3] = 255;
    }
  return { width, height, data, background };
}

type PigxelLayer = {
  name: string;
  visible: boolean;
  opacity: number;
  pixels: string;
};

type PigxelFileV1 = {
  format: "pigxel";
  version: 1;
  width: number;
  height: number;
  background?: Background;
  layers: PigxelLayer[];
};

export class PigxelFileError extends Error {}

export function serializePigxel(image: PigxelImage): string {
  const file: PigxelFileV1 = {
    format: "pigxel",
    version: PIGXEL_VERSION,
    width: image.width,
    height: image.height,
    background: image.background ?? "transparent",
    layers: [
      {
        name: "Layer 1",
        visible: true,
        opacity: 1,
        pixels: toBase64(image.data),
      },
    ],
  };
  return JSON.stringify(file);
}

/** Reads a .pigxel file, throwing a PigxelFileError with a user-facing message. */
export function parsePigxel(text: string): PigxelImage {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new PigxelFileError("This isn’t a Pigxel file.");
  }
  if (!isObject(file) || file.format !== "pigxel")
    throw new PigxelFileError("This isn’t a Pigxel file.");
  if (typeof file.version !== "number" || file.version > PIGXEL_VERSION)
    throw new PigxelFileError(
      "This file was made with a newer version of Pigxel.",
    );

  const { width, height, layers } = file;
  if (!isValidSize(width) || !isValidSize(height))
    throw new PigxelFileError(
      `The tile size must be between 1 and ${MAX_PIGXEL_SIZE} pixels.`,
    );
  const layer = Array.isArray(layers) ? layers[0] : undefined;
  if (!isObject(layer) || typeof layer.pixels !== "string")
    throw new PigxelFileError("This Pigxel file has no pixels.");

  let data: Uint8ClampedArray;
  try {
    data = fromBase64(layer.pixels);
  } catch {
    throw new PigxelFileError("This Pigxel file is damaged.");
  }
  if (data.length !== width * height * 4)
    throw new PigxelFileError("This Pigxel file is damaged.");
  const background = BACKGROUNDS.find((b) => b === file.background);
  return { width, height, data, background: background ?? "transparent" };
}

/** A safe file name ending in .pigxel. */
export function pigxelFileName(name: string) {
  const base =
    stripPigxelExtension(name)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .trim() || "Untitled";
  return base + PIGXEL_EXTENSION;
}

export function stripPigxelExtension(name: string) {
  return name.toLowerCase().endsWith(PIGXEL_EXTENSION)
    ? name.slice(0, -PIGXEL_EXTENSION.length)
    : name;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidSize(value: unknown): value is number {
  return (
    Number.isInteger(value) &&
    (value as number) >= 1 &&
    (value as number) <= MAX_PIGXEL_SIZE
  );
}

function toBase64(bytes: Uint8ClampedArray) {
  let binary = "";
  // Chunked so large tiles don't overflow the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

function fromBase64(text: string) {
  const binary = atob(text);
  const bytes = new Uint8ClampedArray(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
