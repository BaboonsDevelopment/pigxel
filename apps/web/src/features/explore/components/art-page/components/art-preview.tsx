"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { PublicTile } from "@/features/profile/profile";
import { MAX_ZOOM, MIN_ZOOM, nextZoom, type Picture } from "../helpers";

type Anchor = { x: number; y: number; atX: number; atY: number };

const ICON_BUTTON =
  "flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent";

export function ArtPreview({
  tile,
  picture,
  error,
}: {
  tile: PublicTile;
  picture: Picture | null;
  error: string | null;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [dragging, setDragging] = useState(false);
  const anchor = useRef<Anchor | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);

  const fitScale = () => {
    const box = stage.current;
    if (!box || !picture) return 1;
    return Math.min(
      box.clientWidth / picture.width,
      box.clientHeight / picture.height,
    );
  };

  const zoomTo = (next: number, atX?: number, atY?: number) => {
    const box = stage.current;
    const art = canvas.current;
    if (!box || !art) return;
    const rect = art.getBoundingClientRect();
    const frameBox = box.getBoundingClientRect();
    const x = atX ?? frameBox.left + frameBox.width / 2;
    const y = atY ?? frameBox.top + frameBox.height / 2;
    anchor.current = {
      x: (x - rect.left) / rect.width,
      y: (y - rect.top) / rect.height,
      atX: x - frameBox.left,
      atY: y - frameBox.top,
    };
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  };

  const step = (direction: 1 | -1, atX?: number, atY?: number) =>
    zoomTo(nextZoom(zoom ?? fitScale(), direction), atX, atY);

  const latestStep = useRef(step);
  useLayoutEffect(() => {
    latestStep.current = step;
  });

  useLayoutEffect(() => {
    const box = stage.current;
    const art = canvas.current;
    const point = anchor.current;
    if (!box || !art || !point || zoom === null) return;
    anchor.current = null;
    box.scrollLeft = art.offsetLeft + point.x * art.offsetWidth - point.atX;
    box.scrollTop = art.offsetTop + point.y * art.offsetHeight - point.atY;
  }, [zoom]);

  useEffect(() => {
    const box = stage.current;
    if (!box || !picture) return;
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      latestStep.current(e.deltaY < 0 ? 1 : -1, e.clientX, e.clientY);
    };
    box.addEventListener("wheel", wheel, { passive: false });
    return () => box.removeEventListener("wheel", wheel);
  }, [picture]);

  useEffect(() => {
    const shown = picture?.frames[frame];
    if (shown)
      canvas.current?.getContext("2d")?.putImageData(shown.pixels, 0, 0);
  }, [picture, frame]);

  useEffect(() => {
    if (!picture?.animated || !playing) return;
    const timer = setTimeout(
      () => setFrame((i) => (i + 1) % picture.frames.length),
      picture.frames[frame]!.duration,
    );
    return () => clearTimeout(timer);
  }, [picture, frame, playing]);

  const showFrame = (index: number) => {
    if (!picture) return;
    const count = picture.frames.length;
    setPlaying(false);
    setFrame(((index % count) + count) % count);
  };

  const endDrag = () => {
    drag.current = null;
    setDragging(false);
  };

  return (
    <section
      aria-label="Project preview"
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-background shadow-[0_1px_2px_rgb(59_42_51/0.06)]"
    >
      <div className="flex h-8 items-center justify-between gap-3 px-3">
        <span
          className={cn(
            pixelifySans.className,
            "flex items-center gap-2 text-[10px] tracking-wider uppercase",
          )}
        >
          <span aria-hidden="true" className="size-1.5 bg-primary" />
          Project preview
        </span>
        <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {picture?.animated && (
            <button
              type="button"
              aria-label={playing ? "Pause animation" : "Play animation"}
              aria-pressed={!playing}
              onClick={() => setPlaying(!playing)}
              className={ICON_BUTTON}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="size-3.5"
              >
                <path
                  d={
                    playing ? "M4 3h3v10H4zM9 3h3v10H9z" : "M4.5 2.8v10.4L13 8Z"
                  }
                />
              </svg>
            </button>
          )}
          {picture && (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                aria-label="Zoom out"
                disabled={zoom !== null && zoom <= MIN_ZOOM}
                onClick={() => step(-1)}
                className={ICON_BUTTON}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="size-3.5"
                >
                  <path d="M3.5 8h9" />
                </svg>
              </button>
              <button
                type="button"
                title={zoom === null ? "Show actual size" : "Fit to view"}
                onClick={() => (zoom === null ? zoomTo(1) : setZoom(null))}
                className="h-6 min-w-10 cursor-pointer rounded-md px-1 text-center tabular-nums transition-colors hover:bg-muted hover:text-foreground"
              >
                {zoom === null ? "Fit" : `${Math.round(zoom * 100)}%`}
              </button>
              <button
                type="button"
                aria-label="Zoom in"
                disabled={zoom !== null && zoom >= MAX_ZOOM}
                onClick={() => step(1)}
                className={ICON_BUTTON}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="size-3.5"
                >
                  <path d="M3.5 8h9M8 3.5v9" />
                </svg>
              </button>
            </span>
          )}
          <button
            type="button"
            aria-label="Full screen"
            onClick={() => void stage.current?.requestFullscreen()}
            className={ICON_BUTTON}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
            </svg>
          </button>
        </span>
      </div>
      <div
        ref={stage}
        onPointerDown={(e) => {
          const box = e.currentTarget;
          if (
            e.button !== 0 ||
            (box.scrollWidth <= box.clientWidth &&
              box.scrollHeight <= box.clientHeight)
          )
            return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: box.scrollLeft,
            top: box.scrollTop,
          };
          box.setPointerCapture(e.pointerId);
          setDragging(true);
        }}
        onPointerMove={(e) => {
          const start = drag.current;
          if (!start) return;
          e.currentTarget.scrollLeft = start.left - (e.clientX - start.x);
          e.currentTarget.scrollTop = start.top - (e.clientY - start.y);
        }}
        tabIndex={picture?.animated ? 0 : undefined}
        aria-label={
          picture?.animated
            ? "Art, use arrow keys to step through frames"
            : undefined
        }
        onKeyDown={(e) => {
          if (!picture?.animated) return;
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          showFrame(frame + (e.key === "ArrowRight" ? 1 : -1));
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={(e) =>
          zoom === null ? zoomTo(1, e.clientX, e.clientY) : setZoom(null)
        }
        className={cn(
          "flex aspect-[4/3] w-full flex-1 overflow-auto bg-checker outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-inset lg:aspect-auto lg:min-h-0",
          zoom !== null && (dragging ? "cursor-grabbing" : "cursor-grab"),
        )}
      >
        {picture ? (
          <canvas
            ref={canvas}
            width={picture.width}
            height={picture.height}
            style={
              zoom === null
                ? undefined
                : {
                    width: picture.width * zoom,
                    height: picture.height * zoom,
                  }
            }
            className={cn(
              "m-auto shrink-0 [image-rendering:pixelated]",
              zoom === null && "size-full object-contain",
            )}
          />
        ) : (
          <span className="m-auto text-sm text-muted-foreground">
            {error ?? "Loading…"}
          </span>
        )}
      </div>
      {picture?.animated && (
        <div className="flex h-9 items-center gap-2 border-t px-3 text-[10px] text-muted-foreground">
          <button
            type="button"
            aria-label="Previous frame"
            onClick={() => showFrame(frame - 1)}
            className={ICON_BUTTON}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="m10 3.5-4.5 4.5 4.5 4.5" />
            </svg>
          </button>
          <input
            type="range"
            aria-label="Frame"
            min={0}
            max={picture.frames.length - 1}
            value={frame}
            onChange={(e) => showFrame(Number(e.target.value))}
            className="h-1 min-w-0 flex-1 cursor-pointer accent-primary"
          />
          <button
            type="button"
            aria-label="Next frame"
            onClick={() => showFrame(frame + 1)}
            className={ICON_BUTTON}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-3.5"
            >
              <path d="m6 3.5 4.5 4.5L6 12.5" />
            </svg>
          </button>
          <span className="w-12 text-right tabular-nums">
            {frame + 1} / {picture.frames.length}
          </span>
        </div>
      )}
      <div className="flex h-8 items-center justify-between gap-3 px-3 text-[10px] text-muted-foreground">
        <span className="tabular-nums">
          {tile.width} × {tile.height} px
          {picture?.animated && ` · ${picture.frames.length} frames`}
        </span>
        <span className={cn(pixelifySans.className, "text-foreground")}>
          Made by {tile.author.username}
        </span>
      </div>
    </section>
  );
}
