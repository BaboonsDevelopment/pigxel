"use client";

import type { RefObject } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/components/chat-panel/constants";
import type { Area } from "@/components/pixel-canvas/constants";
import type { PixelCanvasHandle } from "@/components/pixel-canvas/pixel-canvas";
import type { LayersApi } from "@/components/pixel-canvas/use-layers";
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
import { MAX_OVERLAP } from "../constants";

/**
 * The AI chat, wired to the canvas. It pulls in the AI, editing and
 * picture-to-pixel-art code, so the editor loads it separately (see
 * editor.tsx) and drawing is ready before it arrives.
 */
export default function EditorChat({
  canvas,
  layers,
  onHighlight,
}: {
  canvas: RefObject<PixelCanvasHandle | null>;
  layers: LayersApi;
  onHighlight: (area: Area | null) => void;
}) {
  const fullArea = (): Area => ({ x: 0, y: 0, ...layers.size });

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
    canPaint: () => layers.canPaint,
    snapshot: (area, background) =>
      canvas.current?.snapshot(area, background) ?? "",
    snapshotLayer: (area, background) =>
      canvas.current?.snapshotLayer(area, background) ?? "",
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
    overlapsDrawing(area) {
      // Art on any layer counts, not only the one being drawn on.
      const pixels = canvas.current?.readTile(area) ?? new Uint8ClampedArray();
      let drawn = 0;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i]) drawn++;
      return drawn > area.w * area.h * MAX_OVERLAP;
    },
    copyObject(source, targets) {
      if (!canvas.current) return;
      const tile = fullArea();
      const before = canvas.current.read(tile);
      const { lifted } = liftObjectsInside(before, tile.w, tile.h, source);
      const after = targets.reduce(
        (pixels, t) =>
          drawOnEmpty(pixels, tile.w, lifted, {
            ...t,
            w: source.w,
            h: source.h,
          }),
        before,
      );
      canvas.current.write(after, tile);
    },
    async placeMany(dataUrl, areas) {
      const arts = await Promise.all(areas.map((a) => toArt(dataUrl, a)));
      if (!canvas.current) return;
      const tile = fullArea();
      const after = arts.reduce(
        (pixels, art, i) => drawOnEmpty(pixels, tile.w, art.rgba, areas[i]!),
        canvas.current.read(tile),
      );
      canvas.current.write(after, tile);
    },
  };

  return <ChatPanel canvas={bridge} />;
}
