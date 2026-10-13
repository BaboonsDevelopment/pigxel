"use client";

import { useEffect, useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { Button } from "@pigxel/ui/components/button";
import { Textarea } from "@pigxel/ui/components/input";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { MAX_NOTE, REVIEW_API } from "../../../constants";
import type { ReviewState, ReviewStatus, ReviewTile } from "../../../types";
import { useReviewActions } from "../../../use-asset-review";
import {
  CARD,
  FRAME_STRIP_SCALE,
  PILL,
  STATE_LABELS,
  TILE_REPEAT,
} from "../constants";
import { errorText } from "../helpers";
import { SpriteCanvas } from "./sprite-canvas";

const STATE_RINGS: Record<ReviewState, string> = {
  pending: "",
  changed: "ring-2 ring-amber-400",
  fix: "ring-2 ring-amber-400",
  approved: "ring-2 ring-success",
};

const STATE_TONES: Record<ReviewState, string> = {
  pending: "bg-white/85 text-muted-foreground",
  changed: "bg-amber-100 text-amber-800",
  fix: "bg-amber-100 text-amber-800",
  approved: "bg-success/15 text-success",
};

export function TileCard({
  tile,
  background,
  blockPremium,
}: {
  tile: ReviewTile;
  background: string;
  blockPremium: boolean;
}) {
  const actions = useReviewActions();
  const [note, setNote] = useState(tile.note);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [clipIndex, setClipIndex] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const clip = tile.clips[clipIndex] ?? tile.clips[0] ?? null;
  const isTile = tile.kind === "tile";

  useEffect(() => {
    if (!tile.w) return;
    let live = true;
    const img = new Image();
    img.onload = () => {
      if (live) setImage(img);
    };
    img.src = `${REVIEW_API}/strip/${tile.pack}/${tile.id}?v=${tile.hash}`;
    return () => {
      live = false;
    };
  }, [tile.pack, tile.id, tile.hash, tile.w]);

  const act = async (action: () => Promise<unknown>) => {
    setPending(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setPending(false);
    }
  };
  const decide = (status: ReviewStatus) =>
    act(() => actions.review(tile.key, status, note));

  return (
    <article className={cn(CARD, "flex flex-col", STATE_RINGS[tile.state])}>
      <div
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden",
          background,
        )}
      >
        {image && (
          <SpriteCanvas
            image={image}
            w={tile.w}
            h={tile.h}
            clip={clip}
            frameMs={tile.frames}
            repeat={isTile ? TILE_REPEAT : 1}
            className={isTile ? "size-full" : "w-3/5"}
          />
        )}
        <span className="pointer-events-none absolute top-2 left-2 flex flex-wrap gap-1">
          <Badge className={STATE_TONES[tile.state]}>
            {STATE_LABELS[tile.state]}
          </Badge>
          {tile.premium && <Badge tone="primary">Premium</Badge>}
          {tile.frames.length > 1 && <Badge tone="overlay">Animated</Badge>}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 border-t py-1.5 pr-1.5 pl-3">
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {tile.name}
          </span>
          <span className="block truncate font-mono text-[11px] text-muted-foreground">
            {tile.id} · {tile.kind ?? "?"} · {tile.w}×{tile.h}
            {tile.frames.length > 1 && ` · ${tile.frames.length} frames`}
          </span>
        </span>
        <button
          type="button"
          aria-pressed={tile.premium}
          disabled={blockPremium || pending}
          title={
            blockPremium ? "The whole block is premium" : "Paid plans only"
          }
          onClick={() =>
            act(() => actions.setTilePremium(tile.key, !tile.premium))
          }
          className={cn(PILL, "h-8 px-3")}
        >
          Premium
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 border-t p-3">
        {tile.clips.length > 1 && (
          <div
            role="group"
            aria-label="Clip"
            className="flex flex-wrap gap-1.5"
          >
            {tile.clips.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-pressed={c === clip}
                onClick={() => setClipIndex(i)}
                className={cn(PILL, "h-7 px-2.5 text-[11px]")}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
        {image && tile.frames.length > 1 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Frames
            </summary>
            <div className="mt-2 overflow-x-auto rounded-lg border">
              <PixelImage
                src={image.src}
                alt=""
                width={image.width * FRAME_STRIP_SCALE}
                height={image.height * FRAME_STRIP_SCALE}
                className={cn("max-w-none", background)}
              />
            </div>
          </details>
        )}
        {tile.notes && (
          <p className="text-xs text-muted-foreground italic">{tile.notes}</p>
        )}
        {tile.issues.length > 0 && (
          <ul className="space-y-0.5 text-[11px]">
            {tile.issues.map((issue, i) => (
              <li
                key={i}
                className={
                  issue.level === "error"
                    ? "text-destructive"
                    : "text-amber-700"
                }
              >
                {issue.rule}: {issue.message}
              </li>
            ))}
          </ul>
        )}
        <Textarea
          rows={2}
          maxLength={MAX_NOTE}
          placeholder="What to fix…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-auto text-xs"
        />
        {rejecting ? (
          <div className="flex items-center gap-2">
            <span className="mr-auto text-xs text-muted-foreground">
              Delete it for good?
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setRejecting(false)}
            >
              Keep
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => act(() => actions.reject(tile.key))}
            >
              Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="flex-1"
              disabled={tile.blocked || pending}
              onClick={() => decide("approved")}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              disabled={!note.trim() || pending}
              onClick={() => decide("fix")}
            >
              To fix
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={() => setRejecting(true)}
              className="text-destructive hover:text-destructive"
            >
              Reject
            </Button>
          </div>
        )}
        {tile.state !== "pending" && !rejecting && (
          <button
            type="button"
            disabled={pending}
            onClick={() => decide("pending")}
            className="self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Back to review
          </button>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </article>
  );
}
