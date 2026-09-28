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

  const bridge: CanvasBridge = {
    isEmpty: () => canvas.current?.isEmpty() ?? true,
    fullArea,
    freeArea: () => canvas.current?.freeArea() ?? null,
    snapshot: () => canvas.current?.snapshot() ?? "",
    selectArea: async () => (await canvas.current?.selectArea()) ?? null,
    adjustArea: async (area) =>
      (await canvas.current?.adjustArea(area)) ?? null,
    highlight: setHighlight,
    // A generated picture is turned into pixel art at the area's size.
    async place(dataUrl, area, replace) {
      const image = await (await fetch(dataUrl)).blob();
      const art = await imageToPixelArt(
        image,
        area.w,
        area.h,
        GENERATED_PICTURE_STEPS,
      );
      if (replace) canvas.current?.clear();
      canvas.current?.draw(art.rgba, area);
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
