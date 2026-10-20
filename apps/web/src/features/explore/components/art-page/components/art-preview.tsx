"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import type { PublicTile } from "@/features/profile/profile";
import type { Picture } from "../helpers";

const OVERLAY_BUTTON =
  "absolute flex size-8 cursor-pointer items-center justify-center rounded-lg bg-background text-[#4a1f35] shadow-[0_1px_3px_rgb(59_42_51/0.18)] transition-colors hover:bg-muted";

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path
        d={
          direction === "left"
            ? "m10 3.5-4.5 4.5 4.5 4.5"
            : "m6 3.5 4.5 4.5L6 12.5"
        }
      />
    </svg>
  );
}

function FrameThumb({ pixels }: { pixels: ImageData }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    canvas.current?.getContext("2d")?.putImageData(pixels, 0, 0);
  }, [pixels]);
  return (
    <canvas
      ref={canvas}
      width={pixels.width}
      height={pixels.height}
      className="size-full object-contain [image-rendering:pixelated]"
    />
  );
}

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
  const [playing, setPlaying] = useState(true);
  const count = picture?.frames.length ?? 0;
  const animated = !!picture?.animated;

  // Drawn before paint, so the canvas never shows empty for a frame.
  useLayoutEffect(() => {
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
    if (!count) return;
    setPlaying(false);
    setFrame(((index % count) + count) % count);
  };

  return (
    <div className="flex flex-col gap-3">
      <section
        aria-label="Art preview"
        className="relative rounded-2xl bg-[#f6e3eb] p-3"
      >
        <div
          ref={stage}
          tabIndex={animated ? 0 : undefined}
          aria-label={
            animated ? "Art, use arrow keys to step through frames" : undefined
          }
          onKeyDown={(e) => {
            if (!animated) return;
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            showFrame(frame + (e.key === "ArrowRight" ? 1 : -1));
          }}
          className="flex aspect-[4/3] w-full overflow-hidden rounded-xl bg-checker outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
        >
          {picture ? (
            <canvas
              ref={canvas}
              width={picture.width}
              height={picture.height}
              className="m-auto size-full object-contain [image-rendering:pixelated]"
            />
          ) : error || !tile.thumbnail ? (
            <span className="m-auto text-sm text-muted-foreground">
              {error ?? "Loading…"}
            </span>
          ) : (
            // The thumbnail stands in while the full art loads, as it did
            // on the page shown before this one (art-page-shell).
            <PixelImage
              src={tile.thumbnail}
              alt=""
              className="m-auto size-full object-contain"
            />
          )}
        </div>
        {animated && (
          <>
            <span className="absolute top-5 left-5 rounded-md bg-background px-2 py-0.5 text-[11px] text-[#4a1f35] tabular-nums shadow-[0_1px_3px_rgb(59_42_51/0.18)]">
              {frame + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Previous frame"
              onClick={() => showFrame(frame - 1)}
              className={cn(OVERLAY_BUTTON, "top-1/2 left-5 -translate-y-1/2")}
            >
              <Chevron direction="left" />
            </button>
            <button
              type="button"
              aria-label="Next frame"
              onClick={() => showFrame(frame + 1)}
              className={cn(OVERLAY_BUTTON, "top-1/2 right-5 -translate-y-1/2")}
            >
              <Chevron direction="right" />
            </button>
          </>
        )}
        <button
          type="button"
          aria-label="Full screen"
          onClick={() => void stage.current?.requestFullscreen()}
          className={cn(OVERLAY_BUTTON, "right-5 bottom-5")}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10" />
          </svg>
        </button>
      </section>
      <div className="flex items-center gap-4">
        {animated && picture && (
          <ul
            aria-label="Frames"
            className="flex min-w-0 gap-3 overflow-x-auto p-0.5"
          >
            {picture.frames.map((f, i) => (
              <li key={i} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Frame ${i + 1}`}
                  aria-current={i === frame}
                  onClick={() => showFrame(i)}
                  className="block h-[72px] w-24 cursor-pointer overflow-hidden rounded-xl border-2 border-transparent bg-checker transition-colors hover:border-primary-soft aria-[current=true]:border-primary"
                >
                  <FrameThumb pixels={f.pixels} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {tile.width} × {tile.height} px · Pixel art
        </span>
      </div>
    </div>
  );
}
