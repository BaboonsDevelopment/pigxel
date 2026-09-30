import { deflateSync, inflateSync } from "fflate";
import { BLEND_MODES, LAYER_KINDS, MAX_OPACITY } from "@/lib/layers/constants";
import { flatten } from "@/lib/layers/composite";
import { createLayer, pixelLayerIds } from "@/lib/layers/tree";
import type { Layer, LayerKind } from "@/lib/layers/types";
import { DEFAULT_FRAME_DURATION } from "@/lib/sprite/constants";
import { celOf, clampDuration, createFrame } from "@/lib/sprite/frames";
import type { Cels, Frame } from "@/lib/sprite/types";

/**
 * The .pigxel file format: UTF-8 JSON with the pixels as compressed base64.
 *
 * {
 *   "format": "pigxel",
 *   "version": 4,
 *   "width": 32,
 *   "height": 32,
 *   "background": "white",
 *   "frames": [{ "id": "…", "duration": 100 }, …],
 *   "layers": [
 *     { "id": "…", "name": "Background", "kind": "background", "visible": true,
 *       "locked": false, "opacity": 255, "blend": "normal" },
 *     { "id": "…", "name": "Group 1", "kind": "group", "visible": true,
 *       "locked": false, "opacity": 255, "blend": "normal", "collapsed": false,
 *       "children": [ …layers… ] }
 *   ],
 *   "cels": [{ "frame": "…", "layer": "…", "pixels": "<base64 deflate>" }, …]
 * }
 *
 * `frames` are the animation in playing order, each shown for `duration`
 * milliseconds; a still tile has one. `layers` is listed bottom to top; a
 * group lists its own layers the same way. A cel is one layer's pixels in one
 * frame: width × height × 4 bytes (red, green, blue, alpha), row by row from
 * the top-left, compressed with DEFLATE (raw, RFC 1951) and base64-encoded;
 * pixel art shrinks many times over. A layer with no cel in a frame is empty
 * there. `opacity`
 * runs 0–255 and `blend` is one of the blend modes in lib/layers.
 * `background` (default "transparent") is what the eraser paints on the
 * Background layer.
 *
 * Version 3 was the same with uncompressed cels. Version 2 had no frames: every layer but a group carried its `pixels`.
 * Version 1 had only a flat list of `{ name, visible, opacity (0–1), pixels }`
 * layers; those two are read as one frame. All are still read. Bump `version` whenever the
 * shape changes, and keep reading older versions.
 */

export const PIGXEL_EXTENSION = ".pigxel";
export const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
export const PIGXEL_VERSION = 4;
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

/** A tile: its size, layer tree, frames and the pixels of every cel. */
export type PigxelDocument = {
  width: number;
  height: number;
  background: Background;
  /** Bottom to top. */
  layers: Layer[];
  /** In playing order; at least one. */
  frames: Frame[];
  cels: Cels;
};

/**
 * A new tile: one frame with a Background layer of the chosen colour (none
 * for a transparent tile) and an empty layer above it to draw on.
 */
export function blankDocument(
  width: number,
  height: number,
  background: Background,
): PigxelDocument {
  const layers: Layer[] = [];
  const frame = createFrame();
  const frameCels = new Map<string, Uint8ClampedArray>();
  const color = backgroundColor(background);
  if (color) {
    const layer = createLayer("background", "Background");
    const data = new Uint8ClampedArray(width * height * 4);
    const value = background === "white" ? 255 : 0;
    for (let i = 0; i < data.length; i += 4)
      data.set([value, value, value, 255], i);
    layers.push(layer);
    frameCels.set(layer.id, data);
  }
  layers.push(createLayer("normal", "Layer 1"));
  return {
    width,
    height,
    background,
    layers,
    frames: [frame],
    cels: new Map([[frame.id, frameCels]]),
  };
}

/**
 * One frame of the tile (the first by default) as one picture; references
 * are left out, as in an export.
 */
export function flattenDocument(
  doc: PigxelDocument,
  skip: LayerKind[] = ["reference"],
  frameId = doc.frames[0]!.id,
): Uint8ClampedArray {
  return flatten(
    doc.layers,
    (id) => celOf(doc.cels, frameId, id),
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
      : base;
  };
  const layerIds = new Set(pixelLayerIds(doc.layers));
  const cels = doc.frames.flatMap((frame) =>
    [...(doc.cels.get(frame.id) ?? [])]
      .filter(([layer]) => layerIds.has(layer))
      .map(([layer, pixels]) => ({
        frame: frame.id,
        layer,
        pixels: encodeCel(pixels),
      })),
  );
  return JSON.stringify({
    format: "pigxel",
    version: PIGXEL_VERSION,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    frames: doc.frames.map(({ id, duration }) => ({ id, duration })),
    layers: doc.layers.map(toFile),
    cels,
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
  // Cels are compressed from version 4 on.
  const compressed = file.version >= 4;
  const readPixels = (value: unknown) => {
    if (typeof value !== "string") throw DAMAGED();
    let data: Uint8ClampedArray;
    try {
      const bytes = fromBase64(value);
      data = compressed
        ? new Uint8ClampedArray(inflateSync(new Uint8Array(bytes.buffer)))
        : bytes;
    } catch {
      throw DAMAGED();
    }
    if (data.length !== width * height * 4) throw DAMAGED();
    return data;
  };

  let layers: Layer[];
  let frames: Frame[];
  let cels: Cels;
  if (file.version >= 3) {
    layers = readLayers(file.layers, new Set(), true);
    frames = readFrames(file.frames);
    cels = readCels(file.cels, frames, layers, readPixels);
  } else {
    // Older files are a single frame, with the pixels inside the layers.
    const pixels = new Map<string, Uint8ClampedArray>();
    const keep: OnPixelLayer = (id, entry) =>
      pixels.set(id, readPixels(entry.pixels));
    layers =
      file.version === 1
        ? readVersion1(file.layers, background, keep)
        : readLayers(file.layers, new Set(), true, keep);
    const frame = createFrame();
    frames = [frame];
    cels = new Map([[frame.id, pixels]]);
  }
  if (!pixelLayerIds(layers).length)
    throw new PigxelFileError("This Pigxel file has no pixels.");
  return { width, height, background, layers, frames, cels };
}

/** Called for each layer with pixels, with the layer's id and its file entry. */
type OnPixelLayer = (id: string, entry: Record<string, unknown>) => void;

/** Version 1: a flat list, the first layer holding the background colour. */
function readVersion1(
  list: unknown,
  background: Background,
  onPixelLayer: OnPixelLayer,
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
    onPixelLayer(layer.id, entry);
    return {
      ...layer,
      visible: entry.visible !== false,
      opacity: isBackground ? MAX_OPACITY : clampOpacity(opacity * MAX_OPACITY),
    };
  });
}

/** The layer tree (versions 2 and 3), checked layer by layer. */
function readLayers(
  list: unknown,
  ids: Set<string>,
  topLevel: boolean,
  onPixelLayer?: OnPixelLayer,
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
    const id = uniqueId(entry.id, ids, layer.id);
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
        children: readLayers(entry.children, ids, false, onPixelLayer),
      };
    onPixelLayer?.(id, entry);
    return { ...layer, ...settings };
  });
}

/** Version 3 frames: at least one, each with a duration in range. */
function readFrames(list: unknown): Frame[] {
  if (!Array.isArray(list) || !list.length) throw DAMAGED();
  const ids = new Set<string>();
  return list.map((entry) => {
    if (!isObject(entry)) throw DAMAGED();
    const frame = createFrame(
      clampDuration(Number(entry.duration ?? DEFAULT_FRAME_DURATION)),
    );
    return { ...frame, id: uniqueId(entry.id, ids, frame.id) };
  });
}

/** Version 3 cels; those of unknown frames or layers are left out. */
function readCels(
  list: unknown,
  frames: Frame[],
  layers: Layer[],
  readPixels: (value: unknown) => Uint8ClampedArray,
): Cels {
  if (!Array.isArray(list)) throw DAMAGED();
  const cels: Cels = new Map(frames.map((frame) => [frame.id, new Map()]));
  const layerIds = new Set(pixelLayerIds(layers));
  for (const entry of list) {
    if (!isObject(entry)) throw DAMAGED();
    const frameCels = cels.get(String(entry.frame));
    const layer = String(entry.layer);
    if (frameCels && layerIds.has(layer))
      frameCels.set(layer, readPixels(entry.pixels));
  }
  return cels;
}

/** Ids tie cels to layers and frames, so a missing or repeated one gets `fresh`. */
function uniqueId(value: unknown, ids: Set<string>, fresh: string) {
  const id =
    typeof value === "string" && value && !ids.has(value) ? value : fresh;
  ids.add(id);
  return id;
}

/** The tile's name without .pigxel or characters file systems refuse. */
export function safeFileBase(name: string) {
  return (
    stripPigxelExtension(name)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .trim() || "Untitled"
  );
}

/** A safe file name ending in .pigxel. */
export function pigxelFileName(name: string) {
  return safeFileBase(name) + PIGXEL_EXTENSION;
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

// Saving happens on every change (the draft), while most cels stay the same:
// each cel's encoding is kept for as long as its pixels are.
const encoded = new WeakMap<Uint8ClampedArray, string>();

function encodeCel(pixels: Uint8ClampedArray) {
  let text = encoded.get(pixels);
  if (text === undefined) {
    text = toBase64(
      deflateSync(
        new Uint8Array(pixels.buffer, pixels.byteOffset, pixels.byteLength),
      ),
    );
    encoded.set(pixels, text);
  }
  return text;
}

function toBase64(bytes: Uint8Array) {
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
