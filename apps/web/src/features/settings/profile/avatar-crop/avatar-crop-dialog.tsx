"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
} from "@pigxel/ui/components/dialog";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import {
  centeredCrop,
  clampCrop,
  coverScale,
  croppedPng,
  CROP_BOX,
  MAX_ZOOM,
  zoomAround,
  type Crop,
} from "./helpers";

export function AvatarCropDialog({
  file,
  onCrop,
  onClose,
}: {
  file: File;
  onCrop: (png: Blob) => void;
  onClose: () => void;
}) {
  const [image, setImage] = useState<{
    bitmap: ImageBitmap;
    url: string;
  } | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    const url = URL.createObjectURL(file);
    createImageBitmap(file).then(
      (bitmap) => {
        if (!live) return bitmap.close();
        setImage({ bitmap, url });
        setCrop(centeredCrop(bitmap.width, bitmap.height));
      },
      () => {
        if (live) setError("This picture couldn’t be read. Try another one.");
      },
    );
    return () => {
      live = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => () => image?.bitmap.close(), [image]);

  const size = image && { w: image.bitmap.width, h: image.bitmap.height };
  const width = size?.w;
  const height = size?.h;

  const drag = (event: React.PointerEvent) => {
    if (!crop || !size || event.button !== 0) return;
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, crop };
    const move = (e: PointerEvent) =>
      setCrop(
        clampCrop(
          {
            ...start.crop,
            x: start.crop.x + e.clientX - start.x,
            y: start.crop.y + e.clientY - start.y,
          },
          size.w,
          size.h,
        ),
      );
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  useEffect(() => {
    const element = box.current;
    if (!element || !width || !height) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      setCrop((current) =>
        current
          ? zoomAround(
              current,
              current.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1),
              width,
              height,
              { x: event.clientX - rect.left, y: event.clientY - rect.top },
            )
          : current,
      );
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [width, height]);

  const save = async () => {
    if (!image || !crop) return;
    setSaving(true);
    try {
      onCrop(await croppedPng(image.bitmap, crop));
    } catch {
      setError("This picture couldn’t be cropped. Try another one.");
      setSaving(false);
    }
  };

  const scale = size && crop ? coverScale(size.w, size.h) * crop.zoom : 1;

  return (
    <Dialog onClose={onClose} size="sm" portal>
      <DialogHeader
        title="Crop your picture"
        description="Drag to move it, scroll or use the slider to zoom."
      />
      <DialogBody className="grid justify-items-center gap-4">
        <div
          ref={box}
          onPointerDown={drag}
          style={{ width: CROP_BOX, height: CROP_BOX }}
          className="relative cursor-grab touch-none overflow-hidden rounded-xl bg-checker select-none active:cursor-grabbing"
        >
          {image && crop && size ? (
            <PixelImage
              src={image.url}
              alt=""
              draggable={false}
              style={{
                width: size.w * scale,
                height: size.h * scale,
                transform: `translate(${crop.x}px, ${crop.y}px)`,
              }}
              className="pointer-events-none absolute top-0 left-0 max-w-none"
            />
          ) : (
            !error && (
              <span className="flex size-full items-center justify-center text-sm text-muted-foreground">
                Loading…
              </span>
            )
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(255_255_255/0.6)] ring-2 ring-white"
          />
        </div>
        <label className="flex w-full items-center gap-3 text-sm">
          <span className="text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={crop?.zoom ?? 1}
            disabled={!crop}
            onChange={(e) =>
              crop &&
              size &&
              setCrop(zoomAround(crop, Number(e.target.value), size.w, size.h))
            }
            className="min-w-0 flex-1 accent-primary"
          />
        </label>
        {error && <FormMessage tone="error">{error}</FormMessage>}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          disabled={!crop || saving}
          onClick={() => void save()}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
