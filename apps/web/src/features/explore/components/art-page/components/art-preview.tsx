"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { PublicTile } from "@/features/profile/profile";
import type { Picture } from "../helpers";

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
  const [fit, setFit] = useState(true);
  const [playing, setPlaying] = useState(true);

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
              className="flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground"
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
          <button
            type="button"
            onClick={() => setFit(!fit)}
            className="cursor-pointer transition-colors hover:text-foreground"
          >
            {fit ? "Actual size" : "Fit to view"}
          </button>
          <button
            type="button"
            aria-label="Full screen"
            onClick={() => void stage.current?.requestFullscreen()}
            className="flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-muted hover:text-foreground"
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
        className="flex aspect-[4/3] w-full flex-1 items-center justify-center overflow-auto bg-checker lg:aspect-auto lg:min-h-0"
      >
        {picture ? (
          <canvas
            ref={canvas}
            width={picture.width}
            height={picture.height}
            className={cn(
              "[image-rendering:pixelated]",
              fit && "size-full object-contain",
            )}
          />
        ) : (
          <span className="text-sm text-muted-foreground">
            {error ?? "Loading…"}
          </span>
        )}
      </div>
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
