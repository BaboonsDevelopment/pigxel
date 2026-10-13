"use client";

import { useEffect, useRef } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { ReviewClip } from "../../../types";
import { CANVAS_SCALE, DEFAULT_FRAME_MS } from "../constants";
import { clipOrder } from "../helpers";

export function SpriteCanvas({
  image,
  w,
  h,
  clip,
  frameMs,
  repeat = 1,
  className,
}: {
  image: HTMLImageElement;
  w: number;
  h: number;
  clip: ReviewClip | null;
  frameMs: number[];
  repeat?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const k = CANVAS_SCALE;

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    const draw = (frame: number) => {
      ctx.clearRect(0, 0, w * repeat * k, h * repeat * k);
      for (let y = 0; y < repeat; y++)
        for (let x = 0; x < repeat; x++)
          ctx.drawImage(
            image,
            frame * w,
            0,
            w,
            h,
            x * w * k,
            y * h * k,
            w * k,
            h * k,
          );
    };
    const order = clip ? clipOrder(clip) : [0];
    let step = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      step = (step + 1) % order.length;
      draw(order[step]!);
      timer = setTimeout(tick, frameMs[order[step]!] || DEFAULT_FRAME_MS);
    };
    draw(order[0]!);
    if (order.length > 1)
      timer = setTimeout(tick, frameMs[order[0]!] || DEFAULT_FRAME_MS);
    return () => clearTimeout(timer);
  }, [image, w, h, k, clip, frameMs, repeat]);

  return (
    <canvas
      ref={ref}
      width={w * repeat * k}
      height={h * repeat * k}
      aria-hidden="true"
      className={cn("[image-rendering:pixelated]", className)}
    />
  );
}
