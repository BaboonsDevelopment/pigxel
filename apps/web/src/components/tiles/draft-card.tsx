"use client";

import Link from "next/link";
import { useState } from "react";
import { buttonClassName } from "@pigxel/ui/components/button";
import { readDraft } from "@/lib/pigxel-file/draft";
import {
  PIGXEL_EXTENSION,
  parsePigxel,
  type PigxelImage,
} from "@/lib/pigxel-file/format";
import { useIsClient } from "@/lib/use-is-client";

/** The tile kept in this browser, or the empty state when there is none. */
export function DraftCard({ userId }: { userId: string }) {
  if (!useIsClient()) return <div className="mt-8 min-h-48" />;
  return <Draft userId={userId} />;
}

function Draft({ userId }: { userId: string }) {
  const [draft] = useState(() => {
    const saved = readDraft(userId);
    try {
      return saved ? { ...saved, image: parsePigxel(saved.file) } : null;
    } catch {
      return null;
    }
  });

  if (!draft)
    return (
      <div className="mt-8 rounded-lg border border-dashed px-6 py-16 text-center">
        <p className="font-medium">No tiles yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first tile to start drawing.
        </p>
      </div>
    );

  return (
    <div className="mt-8 flex flex-wrap items-center gap-6 rounded-lg border p-5">
      <Thumbnail image={draft.image} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {draft.name}
          <span className="text-muted-foreground">{PIGXEL_EXTENSION}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {draft.image.width} × {draft.image.height} ·{" "}
          {draft.driveFile
            ? draft.dirty
              ? "Not yet saved to Google Drive"
              : "Saved to Google Drive"
            : draft.dirty
              ? "Unsaved changes"
              : "Only in this browser"}{" "}
          · Edited {new Date(draft.savedAt).toLocaleString()}
        </p>
      </div>
      <Link href="/tiles/edit" className={buttonClassName}>
        Continue editing
      </Link>
    </div>
  );
}

function Thumbnail({ image }: { image: PigxelImage }) {
  return (
    <canvas
      aria-label="Tile preview"
      width={image.width}
      height={image.height}
      className="size-20 shrink-0 rounded-md border bg-[repeating-conic-gradient(#e5e5e5_0_25%,#fff_0_50%)] bg-[length:12px_12px] object-contain [image-rendering:pixelated]"
      ref={(canvas) => {
        canvas
          ?.getContext("2d")
          ?.putImageData(
            new ImageData(
              new Uint8ClampedArray(image.data),
              image.width,
              image.height,
            ),
            0,
            0,
          );
      }}
    />
  );
}
