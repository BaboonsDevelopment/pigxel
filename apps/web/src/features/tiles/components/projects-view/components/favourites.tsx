"use client";

import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import { useSavedArts, useUnsaveArt } from "../../../queries/saved-arts";
import { ProjectCard } from "../../project-card/project-card";
import { SectionHeader } from "./section-header";

export function Favourites({
  query,
  searched,
  grid,
}: {
  query: string;
  searched: string;
  grid: string;
}) {
  const { arts, loaded } = useSavedArts(searched);
  const unsave = useUnsaveArt();
  const search = query.trim();
  const settled = loaded && search === searched;
  const shown = settled
    ? arts
    : arts.filter((art) =>
        art.name.toLowerCase().includes(search.toLowerCase()),
      );

  return (
    <section aria-labelledby="favourites-heading">
      <SectionHeader
        id="favourites-heading"
        title="Favourite"
        count={String(arts.length)}
        className="mb-3"
      />
      {unsave.error && (
        <FormMessage tone="error" className="mb-4">
          {unsave.error.message}
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
                  onSelect: () => unsave.mutate(art),
                },
              ]}
            />
          ))}
        </ul>
      ) : search ? (
        settled && (
          <EmptyState
            title="Nothing matches your search"
            description="Try a different name, description or tag."
          />
        )
      ) : (
        <EmptyState
          title="No saved arts yet"
          description="Tap “Save project” on any art in Explore to keep it here."
        />
      )}
    </section>
  );
}
