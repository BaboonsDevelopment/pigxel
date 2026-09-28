"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PixelCanvas } from "@/components/pixel-canvas/pixel-canvas";
import {
  DEFAULT_PEN,
  clampPenSize,
  type PenSettings,
} from "@/components/pixel-canvas/pen";
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

export function TileEditor() {
  const [tool, setTool] = useState<ToolId>("pen");
  const [pen, setPen] = useState<PenSettings>(DEFAULT_PEN);

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

  return (
    <div className="grid h-dvh grid-cols-[auto_1fr] grid-rows-[auto_1fr]">
      <header className="col-span-2 flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 border-b bg-background px-4 py-2">
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
          <PixelCanvas pen={pen} />
        </div>
      </main>
    </div>
  );
}
