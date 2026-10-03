import type { Cels } from "@/lib/sprite/types";
import type { Size } from "./constants";
import { canvasOf } from "./helpers";

export const contextOf = (canvas: HTMLCanvasElement | undefined) =>
  canvas?.getContext("2d", { willReadFrequently: true }) ?? null;

export function isTransparent(pixels: Uint8ClampedArray) {
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) return false;
  return true;
}

export class CelCanvases {
  private frames = new Map<string, Map<string, HTMLCanvasElement>>();
  private cache = new WeakMap<HTMLCanvasElement, Uint8ClampedArray>();

  constructor(cels: Cels, size: Size) {
    for (const [frameId, frameCels] of cels)
      for (const [layerId, pixels] of frameCels)
        this.set(frameId, layerId, size, pixels);
  }

  get(frameId: string, layerId: string) {
    return this.frames.get(frameId)?.get(layerId);
  }

  set(
    frameId: string,
    layerId: string,
    size: Size,
    pixels?: Uint8ClampedArray,
  ) {
    const canvas = canvasOf(
      pixels ?? new Uint8ClampedArray(size.w * size.h * 4),
      size,
    );
    let frame = this.frames.get(frameId);
    if (!frame) this.frames.set(frameId, (frame = new Map()));
    frame.set(layerId, canvas);
    return canvas;
  }

  delete(frameId: string, layerId: string) {
    this.frames.get(frameId)?.delete(layerId);
  }

  deleteFrame(frameId: string) {
    this.frames.delete(frameId);
  }

  deleteLayer(layerId: string) {
    for (const frame of this.frames.values()) frame.delete(layerId);
  }

  pixels(frameId: string, layerId: string) {
    const canvas = this.get(frameId, layerId);
    if (!canvas) return undefined;
    let pixels = this.cache.get(canvas);
    if (!pixels) {
      pixels = contextOf(canvas)!.getImageData(
        0,
        0,
        canvas.width,
        canvas.height,
      ).data;
      this.cache.set(canvas, pixels);
    }
    return pixels;
  }

  invalidate(canvas: HTMLCanvasElement) {
    this.cache.delete(canvas);
  }

  list() {
    return [...this.frames].flatMap(([frameId, frame]) =>
      [...frame].map(([layerId, canvas]) => ({ frameId, layerId, canvas })),
    );
  }

  resize(
    next: Size,
    fillOf: (layerId: string) => string | null,
    offset = { x: 0, y: 0 },
  ) {
    for (const { layerId, canvas } of this.list()) {
      const ctx = contextOf(canvas)!;
      const old = ctx.getImageData(0, 0, canvas.width, canvas.height);
      canvas.width = next.w;
      canvas.height = next.h;
      const fill = fillOf(layerId);
      if (fill) {
        ctx.fillStyle = fill;
        ctx.fillRect(0, 0, next.w, next.h);
      }
      ctx.putImageData(old, offset.x, offset.y);
      this.cache.delete(canvas);
    }
  }
}
