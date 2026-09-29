import { BLEND_MODES, LAYER_KINDS, MAX_OPACITY } from "@/lib/layers/constants";
import { flatten } from "@/lib/layers/composite";
import { createLayer, pixelLayerIds } from "@/lib/layers/tree";
import type { Layer, LayerKind } from "@/lib/layers/types";

/**
 * The .pigxel file format: UTF-8 JSON with the pixels as base64 RGBA.
 *
 * {
 *   "format": "pigxel",
 *   "version": 2,
 *   "width": 32,
 *   "height": 32,
 *   "background": "white",
 *   "layers": [
 *     { "id": "…", "name": "Background", "kind": "background", "visible": true,
 *       "locked": false, "opacity": 255, "blend": "normal", "pixels": "<base64>" },
 *     { "id": "…", "name": "Group 1", "kind": "group", "visible": true,
 *       "locked": false, "opacity": 255, "blend": "normal", "collapsed": false,
 *       "children": [ …layers… ] }
 *   ]
 * }
 *
 * `layers` is listed bottom to top; a group lists its own layers the same
 * way. Every layer but a group has `pixels`: width × height × 4 bytes (red,
 * green, blue, alpha), row by row from the top-left. `opacity` runs 0–255 and
 * `blend` is one of the blend modes in lib/layers. `background` (default
 * "transparent") is what the eraser paints on the Background layer.
 *
 * Version 1 had only a flat list of `{ name, visible, opacity (0–1), pixels }`
 * layers; it is still read. Bump `version` whenever the shape changes, and
 * keep reading older versions.
 */

export const PIGXEL_EXTENSION = ".pigxel";
export const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
export const PIGXEL_VERSION = 2;
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

/** A tile: its size, its layer tree and every layer's pixels. */
export type PigxelDocument = {
  width: number;
  height: number;
  background: Background;
  /** Bottom to top. */
  layers: Layer[];
  /** RGBA (width × height × 4) of every layer that isn't a group, by layer id. */
  pixels: Map<string, Uint8ClampedArray>;
};

/**
 * A new tile: a Background layer of the chosen colour (none for a transparent
 * tile) and an empty layer above it to draw on.
 */
export function blankDocument(
  width: number,
  height: number,
  background: Background,
): PigxelDocument {
  const layers: Layer[] = [];
  const pixels = new Map<string, Uint8ClampedArray>();
  const color = backgroundColor(background);
  if (color) {
    const layer = createLayer("background", "Background");
    const data = new Uint8ClampedArray(width * height * 4);
    const value = background === "white" ? 255 : 0;
    for (let i = 0; i < data.length; i += 4)
      data.set([value, value, value, 255], i);
    layers.push(layer);
    pixels.set(layer.id, data);
  }
  const layer = createLayer("normal", "Layer 1");
  layers.push(layer);
  pixels.set(layer.id, new Uint8ClampedArray(width * height * 4));
  return { width, height, background, layers, pixels };
}

/** The tile as one picture; references are left out, as in an export. */
export function flattenDocument(
  doc: PigxelDocument,
  skip: LayerKind[] = ["reference"],
): Uint8ClampedArray {
  return flatten(
    doc.layers,
    (id) => doc.pixels.get(id),
    doc.width * doc.height * 4,
    skip,
  );
}

type FileLayer = {
  id: string;
  name: string;
  kind: LayerKind;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: string;
  pixels?: string;
  collapsed?: boolean;
  children?: FileLayer[];
};

export class PigxelFileError extends Error {}

const DAMAGED = () => new PigxelFileError("This Pigxel file is damaged.");

export function serializePigxel(doc: PigxelDocument): string {
  const toFile = (layer: Layer): FileLayer => {
    const { id, name, kind, visible, locked, opacity, blend } = layer;
    const base = { id, name, kind, visible, locked, opacity, blend };
    return layer.kind === "group"
      ? {
          ...base,
          collapsed: layer.collapsed,
          children: layer.children.map(toFile),
        }
      : { ...base, pixels: toBase64(doc.pixels.get(layer.id)!) };
  };
  return JSON.stringify({
    format: "pigxel",
    version: PIGXEL_VERSION,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    layers: doc.layers.map(toFile),
  });
}

/** Reads a .pigxel file, throwing a PigxelFileError with a user-facing message. */
export function parsePigxel(text: string): PigxelDocument {
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

  const { width, height } = file;
  if (!isValidSize(width) || !isValidSize(height))
    throw new PigxelFileError(
      `The tile size must be between 1 and ${MAX_PIGXEL_SIZE} pixels.`,
    );
  const background =
    BACKGROUNDS.find((b) => b === file.background) ?? "transparent";
  const pixels = new Map<string, Uint8ClampedArray>();
  const readPixels = (value: unknown) => {
    if (typeof value !== "string") throw DAMAGED();
    let data: Uint8ClampedArray;
    try {
      data = fromBase64(value);
    } catch {
      throw DAMAGED();
    }
    if (data.length !== width * height * 4) throw DAMAGED();
    return data;
  };

  const layers =
    file.version === 1
      ? readVersion1(file.layers, background, readPixels, pixels)
      : readLayers(file.layers, readPixels, pixels, new Set(), true);
  if (!pixelLayerIds(layers).length)
    throw new PigxelFileError("This Pigxel file has no pixels.");
  return { width, height, background, layers, pixels };
}

/** Version 1: a flat list, the first layer holding the background colour. */
function readVersion1(
  list: unknown,
  background: Background,
  readPixels: (value: unknown) => Uint8ClampedArray,
  pixels: Map<string, Uint8ClampedArray>,
): Layer[] {
  if (!Array.isArray(list)) return [];
  return list.map((entry, index) => {
    if (!isObject(entry) || typeof entry.pixels !== "string")
      throw new PigxelFileError("This Pigxel file has no pixels.");
    const isBackground = index === 0 && background !== "transparent";
    const layer = createLayer(
      isBackground ? "background" : "normal",
      typeof entry.name === "string" ? entry.name : `Layer ${index + 1}`,
    );
    const opacity = typeof entry.opacity === "number" ? entry.opacity : 1;
    pixels.set(layer.id, readPixels(entry.pixels));
    return {
      ...layer,
      visible: entry.visible !== false,
      opacity: isBackground ? MAX_OPACITY : clampOpacity(opacity * MAX_OPACITY),
    };
  });
}

/** Version 2: the layer tree, checked layer by layer. */
function readLayers(
  list: unknown,
  readPixels: (value: unknown) => Uint8ClampedArray,
  pixels: Map<string, Uint8ClampedArray>,
  ids: Set<string>,
  topLevel: boolean,
): Layer[] {
  if (!Array.isArray(list)) throw DAMAGED();
  return list.map((entry, index): Layer => {
    if (!isObject(entry)) throw DAMAGED();
    const kind = LAYER_KINDS.find((k) => k === entry.kind);
    if (!kind) throw DAMAGED();
    // Only the first top-level layer can be the Background.
    const isBackground = kind === "background" && topLevel && index === 0;
    const layer = createLayer(
      kind === "background" && !isBackground ? "normal" : kind,
      typeof entry.name === "string" ? entry.name.slice(0, 100) : "Layer",
    );
    // Ids tie pixels to layers, so a missing or repeated one gets a new id.
    const id =
      typeof entry.id === "string" && entry.id && !ids.has(entry.id)
        ? entry.id
        : layer.id;
    ids.add(id);
    const settings = {
      id,
      visible: entry.visible !== false,
      locked: entry.locked === true,
      opacity: isBackground
        ? MAX_OPACITY
        : clampOpacity(Number(entry.opacity ?? MAX_OPACITY)),
      blend: isBackground
        ? ("normal" as const)
        : (BLEND_MODES.find((m) => m.id === entry.blend)?.id ?? "normal"),
    };
    if (layer.kind === "group")
      return {
        ...layer,
        ...settings,
        collapsed: entry.collapsed === true,
        children: readLayers(entry.children, readPixels, pixels, ids, false),
      };
    pixels.set(id, readPixels(entry.pixels));
    return { ...layer, ...settings };
  });
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

const clampOpacity = (value: number) =>
  Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_OPACITY, Math.round(value)))
    : MAX_OPACITY;

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
