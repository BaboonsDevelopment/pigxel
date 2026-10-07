"use client";

import { useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import { setTileSaved } from "@/features/explore/actions";
import type { SavedArt } from "@/features/explore/server";
import { ProjectCard } from "../../project-card/project-card";
import { SectionHeader } from "./section-header";

export function Favourites({
  saved,
  query,
  grid,
}: {
  saved: SavedArt[];
  query: string;
  grid: string;
}) {
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const unsave = async (art: SavedArt) => {
    setError(null);
    setRemoved((ids) => new Set(ids).add(art.id));
    const result = await setTileSaved(art.id, false);
    if (!result.error) return;
    setError(result.error);
    setRemoved((ids) => {
      const next = new Set(ids);
      next.delete(art.id);
      return next;
    });
  };

  const arts = saved.filter((art) => !removed.has(art.id));
  const search = query.trim().toLowerCase();
  const shown = search
    ? arts.filter((art) => art.name.toLowerCase().includes(search))
    : arts;

  return (
    <section aria-labelledby="favourites-heading">
      <SectionHeader
        id="favourites-heading"
        title="Favourite"
        count={String(arts.length)}
        className="mb-3"
      />
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      {shown.length ? (
        <ul className={grid}>
          {shown.map((art) => (
            <ProjectCard
              key={art.id}
              name={art.name}
              meta={`by @${art.author} · ${art.width} × ${art.height} px`}
              thumbnail={
                art.thumbnail && <PixelImage src={art.thumbnail} alt="" />
              }
              open={{ href: `/explore/${art.id}` }}
              menu={[
                {
                  label: "Remove from saved",
                  destructive: true,
                  onSelect: () => void unsave(art),
                },
              ]}
            />
          ))}
        </ul>
      ) : search ? (
        <EmptyState
          title="Nothing matches your search"
          description="Try a different name."
        />
      ) : (
        <EmptyState
          title="No saved arts yet"
          description="Tap “Save project” on any art in Explore to keep it here."
        />
      )}
    </section>
  );
}
