"use client";

import { useRef } from "react";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "@/components/pixel-canvas/pixel-canvas";
import { CHROMA_KEY } from "@/lib/image/constants";
import { imageToPixelArt } from "@/lib/image/helpers";

/** The tile page: canvas on the left, AI chat on the right. */
export function TileEditor() {
  const canvas = useRef<PixelCanvasHandle>(null);

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
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)_340px]">
      <main className="flex overflow-auto bg-muted p-12">
        <div className="m-auto">
          <PixelCanvas ref={canvas} />
        </div>
      </main>
      <ChatPanel onImage={placeImage} />
    </div>
  );
}
