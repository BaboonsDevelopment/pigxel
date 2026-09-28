"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import {
  DEFAULT_PEN,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
import { CHROMA_KEY } from "@/lib/image/constants";
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
  const canvas = useRef<PixelCanvasHandle>(null);

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

  // A generated picture is turned into pixel art at the tile's size.
  const placeImage = async (dataUrl: string) => {
    if (!canvas.current) return;
    const { w, h } = canvas.current.size;
    const image = await (await fetch(dataUrl)).blob();
    const { buf } = await imageToPixelArt(image, w, h, {
      chromaKey: CHROMA_KEY,
    });
    canvas.current.draw(buf);
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
      <main className="flex overflow-auto bg-muted p-12">
        <div className="m-auto">
          <PixelCanvas ref={canvas} pen={pen} />
        </div>
      </main>
      <ChatPanel onImage={placeImage} />
    </div>
  );
}
