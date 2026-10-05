"use client";

import { useEffect, useState } from "react";
import { readPublishedTile } from "@/lib/pigxel-file/cloud";
import type { PublicTile } from "@/features/profile/profile";
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
}: {
  tile: PublicTile;
  viewer: { id: string; name: string; avatarUrl: string | null } | null;
  following: boolean;
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
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,708fr)_minmax(0,342fr)] lg:gap-x-[26px] lg:gap-y-[18px] lg:grid-rows-[minmax(0,1fr)_auto]">
        <ArtPreview tile={tile} picture={picture} error={error} />
        <ArtDetails
          tile={tile}
          viewerId={viewer?.id ?? null}
          following={following}
          file={file}
          palette={picture ? paletteOf(picture.frames[0]!.pixels) : []}
        />
        <CommunityCard viewer={viewer} />
        <InspiredCard />
      </div>
    </div>
  );
}
