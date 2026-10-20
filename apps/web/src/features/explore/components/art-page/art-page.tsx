"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import { manrope } from "@/lib/fonts/manrope";
import type { PublicTile } from "@/features/profile/profile";
import type { ArtComment } from "../../comments";
import { ArtNav } from "./components/art-nav";
import { Breadcrumb } from "./components/breadcrumb";
import { ArtDetails } from "./components/art-details";
import { ArtPreview } from "./components/art-preview";
import { CommunityCard } from "./components/community-card";
import { toPicture, type Picture } from "./helpers";

export function ArtPage({
  tile,
  viewer,
  following,
  saved,
  comments,
  related,
}: {
  tile: PublicTile;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  following: boolean;
  saved: boolean;
  comments: { comments: ArtComment[]; count: number };
  /** Remixes, Tagged and Similar strips, streamed in by the server. */
  related: ReactNode;
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
        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          {related}
        </div>
      </div>
    </div>
  );
}
