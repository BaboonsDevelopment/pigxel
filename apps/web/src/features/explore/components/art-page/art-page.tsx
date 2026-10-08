"use client";

import { useEffect, useState } from "react";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import type { PublicTile } from "@/features/profile/profile";
import type { ArtComment } from "../../comments";
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
}: {
  tile: PublicTile;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  following: boolean;
  saved: boolean;
  comments: { comments: ArtComment[]; count: number };
}) {
  const [file, setFile] = useState<string | null>(null);
  const [picture, setPicture] = useState<Picture | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col lg:-mb-8 lg:h-[calc(100dvh-5.5rem)]">
      <Breadcrumb name={tile.name} />
      {tile.inReview && (
        <p
          role="status"
          className="mb-3 rounded-lg bg-pastel-pink-soft px-3 py-2 text-xs"
        >
          Only you can see this until it’s checked, usually within a minute.
        </p>
      )}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,708fr)_minmax(0,342fr)] lg:gap-x-[26px] lg:gap-y-[18px] lg:grid-rows-[minmax(0,1fr)_auto]">
        <ArtPreview tile={tile} picture={picture} error={error} />
        <ArtDetails
          tile={tile}
          viewerId={viewer?.id ?? null}
          following={following}
          saved={saved}
          file={file}
          picture={picture}
          palette={picture ? paletteOf(picture.frames[0]!.pixels) : []}
        />
        <CommunityCard
          tileId={tile.id}
          ownerId={tile.author.id}
          viewer={viewer}
          initial={comments.comments}
          total={comments.count}
        />
        {(tile.allowRemix !== false || viewer?.id === tile.author.id) && (
          <InspiredCard />
        )}
      </div>
    </div>
  );
}
