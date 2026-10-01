"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import { flattenDocument, parsePigxel } from "@/lib/pigxel-file/format";
import type { PublicTile } from "@/lib/profile/profile";
import { samePixels, zoomDialog } from "../helpers";

type Picture = {
  width: number;
  height: number;
  /** Each frame as one picture, with how long it shows. */
  frames: { pixels: ImageData; duration: number }[];
  /** Whether any frame looks different from the first: empty or copied frames don't count. */
  animated: boolean;
};

/**
 * A published art large and crisp; an animation can be played. It grows out
 * of the card it opens from and shrinks back into it.
 */
export function PreviewDialog({
  tile,
  origin,
  onClose,
}: {
  tile: PublicTile;
  /** Where the card is now, to open from and close into. */
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
    // Opens once, from where the card was then.
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

  // Rendered on <body>, outside Explore's scaled page, so it fits the window.
  return createPortal(
    <dialog
      ref={dialog}
      onClose={onClose}
      onCancel={(e) => {
        // Escape shrinks it back too.
        e.preventDefault();
        void dismiss();
      }}
      onClick={(e) => {
        // A click on the dimmed backdrop closes it.
        if (e.target === dialog.current) void dismiss();
      }}
      aria-label={tile.name}
      className="m-auto w-[min(48rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 border-b py-2 pr-2 pl-5">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm">{tile.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            @{tile.author.username} · {tile.width} × {tile.height}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Close"
          onClick={() => void dismiss()}
          className="text-lg leading-none"
        >
          ×
        </Button>
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
          <span className="text-sm text-muted-foreground">Loading…</span>
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
          <span className="text-xs text-muted-foreground tabular-nums">
            {picture!.frames.length} frames
          </span>
        </div>
      )}
    </dialog>,
    document.body,
  );
}
