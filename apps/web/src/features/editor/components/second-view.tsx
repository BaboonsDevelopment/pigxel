"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";
import { allLayers, soloTree } from "@/lib/layers/tree";
import { flatten } from "@/lib/layers/composite";
import { settingsForFrame } from "@/lib/sprite/cel-settings";
import { cn } from "@pigxel/ui/lib/utils";
import {
  PixelCanvas,
  type PixelCanvasHandle,
} from "../pixel-canvas/pixel-canvas";
import { usePan } from "../use-pan";
import { useZoom } from "../use-zoom";
import { ZoomControl } from "./zoom-control";
import { PointerPosition } from "./pointer-position";

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
  const preview = useRef<HTMLCanvasElement>(null);
  const [pinnedFrame, setPinnedFrame] = useState("");
  const [pinnedLayer, setPinnedLayer] = useState("");
  const [pointerPosition, setPointerPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const { sprite } = props;
  const layers = allLayers(sprite.tree);
  const frameId = sprite.frames.some((frame) => frame.id === pinnedFrame)
    ? pinnedFrame
    : "";
  const layerId = layers.some((layer) => layer.id === pinnedLayer)
    ? pinnedLayer
    : "";
  const viewing = !!frameId || !!layerId;
  const pan = usePan();
  const { scale, zoomIn, zoomOut, zoomReset, zoomSet, zoomFit } = useZoom({
    workspace,
    tileRect: () =>
      viewing
        ? (preview.current?.getBoundingClientRect() ?? null)
        : (canvas.current?.tileRect() ?? null),
    initial: 4,
  });
  useLayoutEffect(() => {
    if (!viewing) return;
    const shownFrame = frameId || sprite.frameId;
    const appearance = settingsForFrame(sprite.celSettings, shownFrame);
    const pixels = layerId
      ? flatten(
          soloTree(sprite.tree, layerId),
          (id) => sprite.readCel(id, shownFrame),
          sprite.size.w * sprite.size.h * 4,
          [],
          (id) => appearance.get(id),
        )
      : sprite.composite([], shownFrame);
    preview.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(
          new Uint8ClampedArray(pixels),
          sprite.size.w,
          sprite.size.h,
        ),
        0,
        0,
      );
  });

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col border-l">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-2 py-1 text-xs">
        <label className="flex items-center gap-1">
          Frame
          <select
            aria-label="Second view frame"
            value={frameId}
            onChange={(e) => setPinnedFrame(e.target.value)}
            className="min-w-0 rounded border bg-background p-1"
          >
            <option value="">Follow current</option>
            {sprite.frames.map((frame, index) => (
              <option key={frame.id} value={frame.id}>
                Frame {index + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 items-center gap-1">
          Layer
          <select
            aria-label="Second view layer"
            value={layerId}
            onChange={(e) => setPinnedLayer(e.target.value)}
            className="min-w-0 max-w-40 rounded border bg-background p-1"
          >
            <option value="">All layers</option>
            {layers.map((layer) => (
              <option key={layer.id} value={layer.id}>
                {layer.name}
              </option>
            ))}
          </select>
        </label>
        {viewing && <span className="text-muted-foreground">View only</span>}
      </div>
      <div className="relative flex min-h-0 flex-1">
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
            {viewing ? (
              <canvas
                ref={preview}
                width={sprite.size.w}
                height={sprite.size.h}
                aria-label="Second view preview"
                className="block shrink-0 bg-checker [image-rendering:pixelated]"
                style={{
                  width: sprite.size.w * sprite.pixelRatio.w * scale,
                  height: sprite.size.h * sprite.pixelRatio.h * scale,
                }}
              />
            ) : (
              <PixelCanvas
                ref={canvas}
                scale={scale}
                {...props}
                onPointerPosition={setPointerPosition}
              />
            )}
          </div>
        </section>
        <div className="absolute top-2 right-2">
          <div className="flex items-center gap-0.5 rounded-md border bg-background/90 p-0.5 text-xs shadow-sm">
            <ZoomControl
              scale={scale}
              onChange={zoomSet}
              onFit={zoomFit}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onReset={zoomReset}
            />
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
          <PointerPosition point={viewing ? null : pointerPosition} />
        </div>
      </div>
    </div>
  );
}
