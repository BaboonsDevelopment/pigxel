"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button, IconButton } from "@pigxel/ui/components/button";
import { Text } from "@pigxel/ui/components/typography";
import { FormMessage } from "@pigxel/ui/components/field";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import { flattenDocument, parsePigxel } from "@/lib/pigxel-file/format";
import type { PublicTile } from "@/features/profile/profile";
import { samePixels, zoomDialog } from "../helpers";

type Picture = {
  width: number;
  height: number;
  frames: { pixels: ImageData; duration: number }[];
  animated: boolean;
};

export function PreviewDialog({
  tile,
  origin,
  onClose,
}: {
  tile: PublicTile;
  origin: () => DOMRect | undefined;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);

  const closing = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    void zoomDialog(element, origin(), "in");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismiss = async () => {
    const element = dialog.current;
    if (!element || closing.current) return;
    closing.current = true;
    await zoomDialog(element, origin(), "out");
    element.close();
  };

  useEffect(() => {
    let cancelled = false;
    readPublishedTile({ id: tile.id, userId: tile.author.id })
      .then((text) => {
        const doc = parsePigxel(text);
        const frames = doc.frames.map((f) => ({
          pixels: new ImageData(
            flattenDocument(
              doc,
              ["reference"],
              f.id,
            ) as Uint8ClampedArray<ArrayBuffer>,
            doc.width,
            doc.height,
          ),
          duration: f.duration,
        }));
        const animated = frames.some(
          (f) => !samePixels(f.pixels, frames[0]!.pixels),
        );
        if (!cancelled)
          setPicture({
            width: doc.width,
            height: doc.height,
            frames,
            animated,
          });
      })
      .catch(() => {
        if (!cancelled) setError("Couldn’t load this art. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [tile.id, tile.author.id]);

  useEffect(() => {
    const shown = picture?.frames[frame];
    if (shown)
      canvas.current?.getContext("2d")?.putImageData(shown.pixels, 0, 0);
  }, [picture, frame]);

  useEffect(() => {
    if (!playing || !picture) return;
    const timer = setTimeout(
      () => setFrame((i) => (i + 1) % picture.frames.length),
      picture.frames[frame]!.duration,
    );
    return () => clearTimeout(timer);
  }, [playing, picture, frame]);

  const animated = picture?.animated ?? false;

  return createPortal(
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        void dismiss();
      }}
      onClick={(e) => {
        if (e.target === dialog.current) void dismiss();
      }}
      aria-label={tile.name}
      className="m-auto w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b py-2 pr-2 pl-5">
        <div className="min-w-0">
          <Text className="truncate font-mono">{tile.name}</Text>
          <Text size="xs" tone="muted" className="truncate">
            @{tile.author.username} · {tile.width} × {tile.height}
          </Text>
        </div>
        <IconButton
          label="Close"
          onClick={() => void dismiss()}
          className="text-lg leading-none"
        >
          ×
        </IconButton>
      </div>
      <div className="flex aspect-square max-h-[70vh] w-full items-center justify-center bg-checker">
        {picture ? (
          <canvas
            ref={canvas}
            width={picture.width}
            height={picture.height}
            className="size-full object-contain [image-rendering:pixelated]"
          />
        ) : error ? (
          <FormMessage tone="error">{error}</FormMessage>
        ) : (
          <Text as="span" tone="muted">
            Loading…
          </Text>
        )}
      </div>
      {animated && (
        <div className="flex items-center justify-between gap-4 border-t px-5 py-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-pressed={playing}
            onClick={() => setPlaying(!playing)}
          >
            {playing ? "Pause" : "Play animation"}
          </Button>
          <Text as="span" size="xs" tone="muted" className="tabular-nums">
            {picture!.frames.length} frames
          </Text>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
