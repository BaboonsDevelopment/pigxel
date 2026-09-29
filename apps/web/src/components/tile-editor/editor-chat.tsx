"use client";

import type { RefObject } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/components/chat-panel/constants";
import { DEFAULT_SIZE, type Area } from "@/components/pixel-canvas/constants";
import type { PixelCanvasHandle } from "@/components/pixel-canvas/pixel-canvas";
import { encodeTile } from "@/lib/edit/codec";
import { EDIT_MARGIN } from "@/lib/edit/constants";
import {
  drawOnEmpty,
  findObjects,
  keepMasked,
  liftObjectsInside,
  neighbourMask,
  objectMask,
} from "@/lib/edit/objects";
import { applyOps, parseOps } from "@/lib/edit/ops";
import { paintedBounds } from "@/lib/edit/raster";
import { mergeRedraw } from "@/lib/edit/redraw";
import { imageToPixelArt } from "@/lib/image/helpers";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";

/**
 * The AI chat, wired to the canvas. It pulls in the AI, editing and
 * picture-to-pixel-art code, so the editor loads it separately (see
 * tile-editor.tsx) and drawing is ready before it arrives.
 */
export default function EditorChat({
  canvas,
  onHighlight,
}: {
  canvas: RefObject<PixelCanvasHandle | null>;
  onHighlight: (area: Area | null) => void;
}) {
  const fullArea = (): Area => ({
    x: 0,
    y: 0,
    ...(canvas.current?.size ?? DEFAULT_SIZE),
  });

  // A picture from the AI, turned into pixel art at the area's size.
  const toArt = async (dataUrl: string, area: Area) => {
    const image = await (await fetch(dataUrl)).blob();
    return imageToPixelArt(image, area.w, area.h, GENERATED_PICTURE_STEPS);
  };

  // Pixels an edit of `area` may not change: neighbours reaching into it and
  // the objects the plan said to keep.
  const protectedMask = (tile: Uint8ClampedArray, area: Area, keep: Area[]) => {
    const { w, h } = fullArea();
    const mask = neighbourMask(tile, w, h, area);
    objectMask(tile, w, h, keep).forEach((k, i) => k && (mask[i] = 1));
    return mask;
  };

  const bridge: CanvasBridge = {
    isEmpty: () => canvas.current?.isEmpty() ?? true,
    fullArea,
    freeArea: () => canvas.current?.freeArea() ?? null,
    snapshot: (area, background) =>
      canvas.current?.snapshot(area, background) ?? "",
    selectArea: async () => (await canvas.current?.selectArea()) ?? null,
    adjustArea: async (area) =>
      (await canvas.current?.adjustArea(area)) ?? null,
    highlight: onHighlight,
    async place(dataUrl, area, replace) {
      const art = await toArt(dataUrl, area);
      if (replace) canvas.current?.clear();
      canvas.current?.draw(art.rgba, area);
    },
    paintedArea(area) {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return paintedBounds(pixels, tile.w, area, EDIT_MARGIN);
    },
    encode(area) {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return encodeTile(pixels, tile.w, tile.h, area);
    },
    // Edits change what lies fully inside their area; drawings that only
    // reach into it (a neighbour's edge) are always put back untouched.
    applyEdit(lines, palette, area, keep) {
      if (!canvas.current) return 0;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const { ops } = parseOps(lines);
      const result = applyOps(before, tile.w, ops, palette, area);
      const mask = protectedMask(before, area, keep);
      canvas.current.write(keepMasked(before, result.pixels, mask), tile);
      return result.applied;
    },
    async applyRedraw(dataUrl, area, keep) {
      const art = await toArt(dataUrl, area);
      if (!canvas.current) return;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const after = new Uint8ClampedArray(before);
      const merged = mergeRedraw(canvas.current.read(area), art.rgba);
      for (let y = 0; y < area.h; y++) {
        const row = merged.subarray(y * area.w * 4, (y + 1) * area.w * 4);
        after.set(row, ((area.y + y) * tile.w + area.x) * 4);
      }
      const mask = protectedMask(before, area, keep);
      canvas.current.write(keepMasked(before, after, mask), tile);
    },
    objects() {
      const tile = fullArea();
      const pixels = canvas.current?.read(tile) ?? new Uint8ClampedArray();
      return findObjects(pixels, tile.w, tile.h);
    },
    async replaceObject(dataUrl, source, target) {
      const art = await toArt(dataUrl, target);
      if (!canvas.current) return;
      const tile = fullArea();
      const { rest } = liftObjectsInside(
        canvas.current.read(tile),
        tile.w,
        tile.h,
        source,
      );
      // The moved or resized object never covers other drawings.
      canvas.current.write(drawOnEmpty(rest, tile.w, art.rgba, target), tile);
    },
    moveObject(source, target) {
      if (!canvas.current) return;
      const tile = fullArea();
      const { rest, lifted } = liftObjectsInside(
        canvas.current.read(tile),
        tile.w,
        tile.h,
        source,
      );
      const placed = { ...target, w: source.w, h: source.h };
      canvas.current.write(drawOnEmpty(rest, tile.w, lifted, placed), tile);
    },
  };

  return <ChatPanel canvas={bridge} />;
}
