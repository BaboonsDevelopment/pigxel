"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import type { CanvasBridge } from "@/components/chat-panel/constants";
import {
  DEFAULT_SCALE,
  DEFAULT_SIZE,
  type Area,
} from "@/components/pixel-canvas/constants";
import { zoom } from "@/components/pixel-canvas/helpers";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  DEFAULT_PEN,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
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
import { paintedBounds } from "@/lib/edit/raster";
import { applyOps, parseOps } from "@/lib/edit/ops";
import { mergeRedraw } from "@/lib/edit/redraw";
import { GENERATED_PICTURE_STEPS } from "@/lib/image/pipeline";
import { imageToPixelArt } from "@/lib/image/helpers";
import { PenOptions } from "./pen-options";
import { ToolBar } from "./tool-bar";
import { TOOLS, type ToolId } from "./tools";

/** Typing in a field must not trigger editor shortcuts. */
function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** The tile page: tools on the left, canvas in the middle, AI chat on the right. */
export function TileEditor() {
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(DEFAULT_PEN);
  const [scale, setScale] = useState(DEFAULT_SCALE);
  const [highlight, setHighlight] = useState<Area | null>(null);
  const canvas = useRef<PixelCanvasHandle>(null);
  const workspace = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const shortcut = TOOLS.find(
        (t) => t.shortcut.toLowerCase() === e.key.toLowerCase(),
      );
      if (shortcut) setTool(shortcut.id);
      else if (e.key === "[")
        setPen((p) => ({ ...p, size: clampPenSize(p.size - 1) }));
      else if (e.key === "]")
        setPen((p) => ({ ...p, size: clampPenSize(p.size + 1) }));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // The wheel zooms the tile instead of scrolling the page.
  useEffect(() => {
    const area = workspace.current;
    if (!area) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setScale((s) => zoom(s, e.deltaY));
    };
    area.addEventListener("wheel", onWheel, { passive: false });
    return () => area.removeEventListener("wheel", onWheel);
  }, []);

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
    highlight: setHighlight,
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

  return (
    <div className="grid h-dvh grid-cols-[auto_minmax(0,1fr)_340px] grid-rows-[auto_minmax(0,1fr)]">
      <header className="col-span-3 flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b bg-background px-4 py-2">
        <Link
          href="/tiles"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Your tiles
        </Link>
        {tool === "pen" && <PenOptions pen={pen} onChange={setPen} />}
      </header>
      <ToolBar tool={tool} onSelect={setTool} />
      <main ref={workspace} className="flex overflow-auto bg-muted p-12">
        <div className="m-auto">
          <PixelCanvas
            ref={canvas}
            pen={pen}
            scale={scale}
            highlight={highlight}
          />
        </div>
      </main>
      <ChatPanel canvas={bridge} />
    </div>
  );
}
