"use client";

import { useRef, type ComponentProps } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "../pixel-canvas/pixel-canvas";
import { usePan } from "../use-pan";
import { useZoom } from "../use-zoom";

const ZOOM_BUTTON =
  "grid size-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground";

export function SecondView({
  canvas: props,
  onClose,
}: {
  canvas: Omit<ComponentProps<typeof PixelCanvas>, "ref" | "scale">;
  onClose: () => void;
}) {
  const workspace = useRef<HTMLElement>(null);
  const canvas = useRef<PixelCanvasHandle>(null);
  const pan = usePan();
  const { scale, zoomIn, zoomOut, zoomReset } = useZoom({
    workspace,
    tileRect: () => canvas.current?.tileRect() ?? null,
    initial: 4,
  });

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 border-l">
      <section
        ref={workspace}
        aria-label="Second view of the tile"
        {...pan.handlers}
        className={cn(
          "flex min-h-0 min-w-0 flex-1 overflow-auto bg-muted p-12",
          pan.panning && "cursor-grab [&_*]:cursor-grab!",
        )}
      >
        <div className="m-auto">
          <PixelCanvas ref={canvas} scale={scale} {...props} />
        </div>
      </section>
      <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5 text-xs shadow-sm">
        <button
          type="button"
          aria-label="Zoom out"
          onClick={zoomOut}
          className={ZOOM_BUTTON}
        >
          −
        </button>
        <button
          type="button"
          title="Reset zoom"
          onClick={zoomReset}
          className="min-w-9 tabular-nums"
        >
          {scale >= 1 ? Math.round(scale) : scale.toFixed(2)}×
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          onClick={zoomIn}
          className={ZOOM_BUTTON}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Close the second view"
          title="Close the second view"
          onClick={onClose}
          className={ZOOM_BUTTON}
        >
          ×
        </button>
      </div>
    </div>
  );
}
