"use client";

import { useEffect, useRef } from "react";
import type { TileSize } from "@/lib/tilemap/tilemap";

export function TileSwatch({
  pixels,
  tile,
}: {
  pixels: Uint8ClampedArray;
  tile: TileSize;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    canvas.current
      ?.getContext("2d")
      ?.putImageData(
        new ImageData(new Uint8ClampedArray(pixels), tile.w, tile.h),
        0,
        0,
      );
  }, [pixels, tile]);
  return (
    <canvas
      ref={canvas}
      width={tile.w}
      height={tile.h}
      className="block size-full bg-checker object-contain [image-rendering:pixelated]"
    />
  );
}
