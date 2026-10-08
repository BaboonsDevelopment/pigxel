"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import { scrollParent } from "@/lib/utils/scroll-parent";
import type { PublicTile } from "@/features/profile/profile";
import type { AuthorArt } from "@/features/profile/server";
import type { ArtComment } from "../../comments";
import { ArtNav } from "./components/art-nav";
import { Breadcrumb } from "./components/breadcrumb";
import { ArtDetails } from "./components/art-details";
import { ArtPreview } from "./components/art-preview";
import { CommunityCard } from "./components/community-card";
import { InspiredCard } from "./components/inspired-card";
import { paletteOf, toPicture, type Picture } from "./helpers";

export function ArtPage({
  tile,
  viewer,
  following,
  saved,
  comments,
  moreArts,
}: {
  tile: PublicTile;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  following: boolean;
  saved: boolean;
  comments: { comments: ArtComment[]; count: number };
  moreArts: AuthorArt[];
}) {
  const [file, setFile] = useState<string | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const [topRow, setTopRow] = useState<number | null>(null);
  useEffect(() => {
    const scroller = scrollParent(grid.current);
    if (!scroller) return;
    const before = scroller.style.scrollbarGutter;
    scroller.style.scrollbarGutter = "stable";
    return () => {
      scroller.style.scrollbarGutter = before;
    };
  }, []);

  const expandComments = (open: boolean) => {
    if (!open) return setTopRow(null);
    if (topRow !== null) return;
    const height =
      grid.current?.firstElementChild?.getBoundingClientRect().height;
    if (height) setTopRow(height);
  };

  useEffect(() => {
    let cancelled = false;
    readPublishedTile({ id: tile.id, userId: tile.author.id })
      .then((text) => {
        if (cancelled) return;
        setFile(text);
        setPicture(toPicture(text));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn’t load this art. Try again.");
      });
    return () => {
      cancelled = true;
    };
  }, [tile.id, tile.author.id]);

  return (
    <div
      className={cn(
        "flex flex-col lg:-mb-8",
        topRow === null && "lg:h-[calc(100dvh-5.5rem)]",
      )}
    >
      <Breadcrumb name={tile.name}>
        <ArtNav tileId={tile.id} />
      </Breadcrumb>
      {tile.inReview && (
        <p
          role="status"
          className="mb-3 rounded-lg bg-pastel-pink-soft px-3 py-2 text-xs"
        >
          Only you can see this until it’s checked, usually within a minute.
        </p>
      )}
      <div
        ref={grid}
        style={
          topRow === null
            ? undefined
            : ({ "--top-row": `${topRow}px` } as CSSProperties)
        }
        className={cn(
          "grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,708fr)_minmax(0,342fr)] lg:gap-x-[26px] lg:gap-y-[18px]",
          topRow === null
            ? "lg:grid-rows-[minmax(0,1fr)_auto]"
            : "lg:grid-rows-[var(--top-row)_auto]",
        )}
      >
        <ArtPreview tile={tile} picture={picture} error={error} />
        <ArtDetails
          tile={tile}
          viewerId={viewer?.id ?? null}
          following={following}
          saved={saved}
          file={file}
          picture={picture}
          palette={picture ? paletteOf(picture.frames[0]!.pixels) : []}
          moreArts={moreArts}
          className={
            moreArts.length ? "lg:row-span-2 lg:self-start" : undefined
          }
        />
        <CommunityCard
          tileId={tile.id}
          viewer={viewer}
          initial={comments.comments}
          total={comments.count}
          onExpandedChange={expandComments}
        />
        {moreArts.length === 0 &&
          (tile.allowRemix !== false || viewer?.id === tile.author.id) && (
            <div className="lg:self-start">
              <InspiredCard />
            </div>
          )}
      </div>
    </div>
  );
}
