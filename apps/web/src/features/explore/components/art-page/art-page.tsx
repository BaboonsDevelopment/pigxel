"use client";

import { useEffect, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import { manrope } from "@/lib/fonts/manrope";
import type { PublicTile } from "@/features/profile/profile";
import type { ArtComment } from "../../comments";
import { ArtNav } from "./components/art-nav";
import { Breadcrumb } from "./components/breadcrumb";
import { ArtDetails } from "./components/art-details";
import { ArtPreview } from "./components/art-preview";
import { ArtStrip } from "./components/art-strip";
import { CommunityCard } from "./components/community-card";
import { canvasSizeOf } from "../../constants";
import { toPicture, type Picture } from "./helpers";

export function ArtPage({
  tile,
  viewer,
  following,
  saved,
  comments,
  remixes,
  sameTags,
  similar,
}: {
  tile: PublicTile;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  following: boolean;
  saved: boolean;
  comments: { comments: ArtComment[]; count: number };
  remixes: PublicTile[];
  /** Works sharing its tags. */
  sameTags: PublicTile[];
  /** Works at its canvas size, besides those sharing its tags. */
  similar: PublicTile[];
}) {
  const [file, setFile] = useState<string | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(comments.count);

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
    <div className={cn(manrope.className, "text-[#4a1f35]")}>
      <Breadcrumb>
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
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-[auto_1fr]">
        <ArtPreview tile={tile} picture={picture} error={error} />
        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ArtDetails
            tile={tile}
            viewerId={viewer?.id ?? null}
            following={following}
            saved={saved}
            file={file}
            picture={picture}
            commentCount={commentCount}
          />
          <CommunityCard
            tileId={tile.id}
            artistId={tile.author.id}
            viewer={viewer}
            initial={comments.comments}
            total={comments.count}
            onCountChange={setCommentCount}
          />
        </div>
        {(remixes.length > 0 || sameTags.length > 0 || similar.length > 0) && (
          <div className="flex flex-col gap-8 lg:col-start-1 lg:row-start-2 lg:self-start">
            {remixes.length > 0 && (
              <ArtStrip
                title={`Remixes (${tile.remixes ?? remixes.length})`}
                arts={remixes}
              />
            )}
            {sameTags.length > 0 && (
              <ArtStrip
                title={`Tagged ${tile.tags
                  .slice(0, 3)
                  .map((tag) => `#${tag.toLowerCase()}`)
                  .join(" ")}`}
                arts={sameTags}
                viewAll={`/explore?tag=${encodeURIComponent(tile.tags.join(","))}`}
              />
            )}
            {similar.length > 0 && (
              <ArtStrip
                title="Similar artwork"
                arts={similar}
                viewAll={similarHref(tile)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Explore filtered to the art's canvas size, where "Similar artwork" comes from. */
function similarHref(tile: Pick<PublicTile, "width" | "height">) {
  const size = canvasSizeOf(tile.width, tile.height);
  return size ? `/explore?size=${size.value}` : "/explore";
}
