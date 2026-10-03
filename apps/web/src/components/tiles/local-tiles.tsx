"use client";

import { useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { listDrafts, type Draft } from "@/lib/pigxel-file/draft";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { ProjectCard } from "./project-card/project-card";
import { confirmRemoveLocalTile } from "./tile-actions";
import { TileThumbnail } from "./tile-thumbnail";

type LocalTile = Draft & { image: PigxelDocument };

export function LocalTiles(props: { userId: string; hasCloudTiles: boolean }) {
  if (!useDraftsLoaded(props.userId)) return <div className="mt-6 min-h-48" />;
  return <List {...props} />;
}

function readTiles(userId: string): LocalTile[] {
  return listDrafts(userId).flatMap((draft) => {
    if (draft.location?.kind === "cloud") return [];
    try {
      return [{ ...draft, image: parsePigxel(draft.file) }];
    } catch {
      return [];
    }
  });
}

function List({
  userId,
  hasCloudTiles,
}: {
  userId: string;
  hasCloudTiles: boolean;
}) {
  const [tiles, setTiles] = useState(() => readTiles(userId));

  if (tiles.length === 0)
    return hasCloudTiles ? null : (
      <EmptyState
        className="mt-6"
        title="No tiles yet"
        description="Create your first tile to start drawing."
      />
    );

  return (
    <section aria-labelledby="local-tiles-heading" className="mt-6">
      <h2
        id="local-tiles-heading"
        className="mb-3 font-display text-xl tracking-tight"
      >
        In this browser
      </h2>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <ProjectCard
            key={tile.id}
            name={tile.name}
            thumbnail={<TileThumbnail image={tile.image} />}
            open={{ href: editorUrl(tile.id) }}
            menu={[
              {
                label:
                  tile.location?.kind === "drive"
                    ? "Remove from this browser"
                    : "Delete",
                destructive: true,
                onSelect: async () => {
                  if (await confirmRemoveLocalTile(userId, tile))
                    setTiles(readTiles(userId));
                },
              },
            ]}
          />
        ))}
      </ul>
    </section>
  );
}
