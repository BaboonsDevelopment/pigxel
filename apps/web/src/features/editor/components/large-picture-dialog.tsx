"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import type { DecodedAnimation } from "@/lib/image/gif-decode";
import { MAX_PIGXEL_SIZE } from "@/lib/pigxel-file/format";

const PREVIEW = 360;

type Area = { x: number; y: number; w: number; h: number };

export function LargePictureDialog({
  picture,
  onOpen,
  onClose,
}: {
  picture: DecodedAnimation;
  onOpen: (area: Area | null) => void;
  onClose: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const w = Math.min(picture.w, MAX_PIGXEL_SIZE);
  const h = Math.min(picture.h, MAX_PIGXEL_SIZE);
  const [area, setArea] = useState<Area>(() => ({
    x: Math.floor((picture.w - w) / 2),
    y: Math.floor((picture.h - h) / 2),
    w,
    h,
  }));
  const scale = Math.min(PREVIEW / picture.w, PREVIEW / picture.h);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    const frame = picture.frames[0];
    if (!ctx || !frame) return;
    ctx.putImageData(
      new ImageData(new Uint8ClampedArray(frame.rgba), picture.w, picture.h),
      0,
      0,
    );
  }, [picture]);

  const drag = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, area };
    const move = (e: PointerEvent) =>
      setArea({
        ...start.area,
        x: Math.round(
          Math.min(
            picture.w - start.area.w,
            Math.max(0, start.area.x + (e.clientX - start.x) / scale),
          ),
        ),
        y: Math.round(
          Math.min(
            picture.h - start.area.h,
            Math.max(0, start.area.y + (e.clientY - start.y) / scale),
          ),
        ),
      });
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <Dialog onClose={onClose} size="md" portal>
      <DialogHeader
        title="This picture is too big for a tile"
        description={`It’s ${picture.w} × ${picture.h} px, and tiles go up to ${MAX_PIGXEL_SIZE} × ${MAX_PIGXEL_SIZE}. Crop a piece at full detail, or scale the whole picture down.`}
      />
      <DialogBody className="grid justify-items-center gap-3">
        <div
          className="relative overflow-hidden rounded-lg bg-checker"
          style={{ width: picture.w * scale, height: picture.h * scale }}
        >
          <canvas
            ref={canvas}
            width={picture.w}
            height={picture.h}
            className="block size-full [image-rendering:pixelated]"
          />
          <div
            onPointerDown={drag}
            style={{
              left: area.x * scale,
              top: area.y * scale,
              width: area.w * scale,
              height: area.h * scale,
            }}
            className="absolute cursor-move touch-none rounded-sm shadow-[0_0_0_999px_rgb(255_255_255/0.55)] ring-2 ring-primary"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Drag the frame to choose the {area.w} × {area.h} px piece to keep.
        </p>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={() => onOpen(null)}>
          Scale down to fit
        </Button>
        <Button type="button" onClick={() => onOpen(area)}>
          Crop
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
