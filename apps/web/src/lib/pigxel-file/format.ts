import { deflateSync, inflateSync } from "fflate";
import { BLEND_MODES, LAYER_KINDS, MAX_OPACITY } from "@/lib/layers/constants";
import { readColorMode, type ColorMode } from "@/lib/palette/color-mode";
import { DEFAULT_PALETTE, readPalette } from "@/lib/palette/presets";
import { readSlices, type Slice } from "@/lib/slices/slices";
import {
  isSquare,
  readPixelRatio,
  type PixelRatio,
} from "@/lib/sprite/pixel-ratio";
import { flatten } from "@/lib/layers/composite";
import { createLayer, pixelLayerIds } from "@/lib/layers/tree";
import type { Layer, LayerKind } from "@/lib/layers/types";
import { DEFAULT_FRAME_DURATION } from "@/lib/sprite/constants";
import { celOf, clampDuration, createFrame } from "@/lib/sprite/frames";
import type { Cels, Frame } from "@/lib/sprite/types";
import { readFrameTags, type FrameTag } from "@/lib/sprite/tags";
import { readCelLinks, type CelLink } from "@/lib/sprite/cel-links";

export const PIGXEL_EXTENSION = ".pigxel";
export const PIGXEL_MIME_TYPE = "application/vnd.pigxel+json";
const PIGXEL_VERSION = 6;
export const MAX_PIGXEL_SIZE = 256;

const BACKGROUNDS = ["transparent", "white", "black"] as const;
export type Background = (typeof BACKGROUNDS)[number];

export function backgroundColor(background: Background) {
  return background === "white"
    ? "#ffffff"
    : background === "black"
      ? "#000000"
      : null;
}

export type PigxelDocument = {
  id: string;
  width: number;
  height: number;
  background: Background;
  layers: Layer[];
  frames: Frame[];
  tags?: FrameTag[];
  links?: CelLink[];
  cels: Cels;
  palette: string[];
  slices: Slice[];
  colorMode?: ColorMode;
  pixelRatio?: PixelRatio;
};

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
    id: crypto.randomUUID(),
    width,
    height,
    background,
    layers,
    frames: [frame],
    tags: [],
    links: [],
    cels: new Map([[frame.id, frameCels]]),
    palette: [...DEFAULT_PALETTE],
    slices: [],
  };
}

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
  labelColor?: string;
  collapsed?: boolean;
  children?: FileLayer[];
};

export class PigxelFileError extends Error {}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DAMAGED = () => new PigxelFileError("This Pigxel file is damaged.");

export function serializePigxel(doc: PigxelDocument): string {
  const toFile = (layer: Layer): FileLayer => {
    const { id, name, kind, visible, locked, opacity, blend, labelColor } =
      layer;
    const base = {
      id,
      name,
      kind,
      visible,
      locked,
      opacity,
      blend,
      ...(labelColor && { labelColor }),
    };
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
    id: doc.id,
    width: doc.width,
    height: doc.height,
    background: doc.background,
    frames: doc.frames.map(({ id, duration }) => ({ id, duration })),
    tags: doc.tags ?? [],
    links: doc.links ?? [],
    layers: doc.layers.map(toFile),
    cels,
    palette: doc.palette,
    slices: doc.slices,
    ...(doc.colorMode &&
      doc.colorMode !== "rgb" && { colorMode: doc.colorMode }),
    ...(!isSquare(doc.pixelRatio) && { pixelRatio: doc.pixelRatio }),
  });
}

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
  const id =
    typeof file.id === "string" && UUID.test(file.id)
      ? file.id
      : crypto.randomUUID();
  const palette = readPalette(file.palette) ?? [...DEFAULT_PALETTE];
  const slices = readSlices(file.slices);
  return {
    id,
    width,
    height,
    background,
    layers,
    frames,
    tags: readFrameTags(file.tags, frames.length),
    links: readCelLinks(
      file.links,
      frames.map((frame) => frame.id),
      pixelLayerIds(layers),
    ),
    cels,
    palette,
    slices,
    colorMode: readColorMode(file.colorMode),
    pixelRatio: readPixelRatio(file.pixelRatio),
  };
}

type OnPixelLayer = (id: string, entry: Record<string, unknown>) => void;

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
      labelColor:
        typeof entry.labelColor === "string" &&
        /^#[0-9a-fA-F]{6}$/.test(entry.labelColor)
          ? entry.labelColor
          : undefined,
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

function uniqueId(value: unknown, ids: Set<string>, fresh: string) {
  const id =
    typeof value === "string" && value && !ids.has(value) ? value : fresh;
  ids.add(id);
  return id;
}

export function safeFileBase(name: string) {
  return (
    stripPigxelExtension(name)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
      .trim() || "Untitled"
  );
}

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
