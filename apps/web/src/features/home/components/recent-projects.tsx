"use client";

import { useReducer } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listDrafts, type Draft } from "@/lib/pigxel-file/draft";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import {
  confirmRemoveLocalTile,
  useCloudTileActions,
} from "@/features/tiles/tile-actions";
import { ProjectCard } from "@/features/tiles/components/project-card/project-card";
import { TileThumbnail } from "@/features/tiles/components/tile-thumbnail";
import { PixelImage } from "@/components/ui/pixel-image";
import { pixelifySans } from "@/lib/fonts/pixelify";
import { NewProjectButton } from "./new-project-button";
import { TilesBadge } from "@/features/tiles/components/tiles-badge";
import { hasTilemap } from "@/lib/tilemap/tilemap";
import styles from "./recent-projects.module.css";

type Project =
  | {
      kind: "local";
      id: string;
      name: string;
      at: number;
      draft: Draft;
      image: PigxelDocument;
    }
  | {
      kind: "cloud";
      id: string;
      name: string;
      at: number;
      tile: CloudTileSummary;
    };

function merge(userId: string, cloudTiles: CloudTileSummary[]): Project[] {
  const local = listDrafts(userId).flatMap((draft): Project[] => {
    if (draft.location?.kind === "cloud") return [];
    try {
      const image = parsePigxel(draft.file);
      return [
        {
          kind: "local",
          id: draft.id,
          name: draft.name,
          at: draft.savedAt,
          draft,
          image,
        },
      ];
    } catch {
      return [];
    }
  });
  const cloud = cloudTiles.map((tile): Project => ({
    kind: "cloud",
    id: tile.id,
    name: tile.name,
    at: Date.parse(tile.updatedAt),
    tile,
  }));
  return [...local, ...cloud].sort((a, b) => b.at - a.at);
}

export function RecentProjects(props: {
  userId: string;
  cloudTiles: CloudTileSummary[];
  limit: number;
}) {
  if (!useDraftsLoaded(props.userId)) return <div className="min-h-44" />;
  return <Row {...props} />;
}

function Row({
  userId,
  cloudTiles,
  limit,
}: {
  userId: string;
  cloudTiles: CloudTileSummary[];
  limit: number;
}) {
  const cloud = useCloudTileActions(userId);
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  const projects = merge(userId, cloudTiles)
    .filter((p) => !(p.kind === "cloud" && cloud.removed.has(p.id)))
    .slice(0, limit);

  return (
    <>
      {cloud.error && (
        <FormMessage tone="error" className="mb-4">
          {cloud.error}
        </FormMessage>
      )}
      <ul className={styles.grid}>
        {projects.map((project) =>
          project.kind === "local" ? (
            <ProjectCard
              key={project.id}
              aspect={THUMBNAIL}
              name={project.name}
              thumbnail={<TileThumbnail image={project.image} />}
              badges={hasTilemap(project.image) && <TilesBadge />}
              open={{ href: editorUrl(project.id) }}
              menu={[
                {
                  label: "Delete",
                  destructive: true,
                  onSelect: async () => {
                    if (await confirmRemoveLocalTile(userId, project.draft))
                      refresh();
                  },
                },
              ]}
            />
          ) : (
            <ProjectCard
              key={project.id}
              aspect={THUMBNAIL}
              name={project.name}
              thumbnail={
                project.tile.thumbnail && (
                  <PixelImage src={project.tile.thumbnail} alt="" />
                )
              }
              badges={project.tile.tilemap && <TilesBadge />}
              open={{ onClick: () => void cloud.open(project.tile) }}
              opening={cloud.busy === project.id}
              disabled={cloud.busy !== null}
              menu={[
                {
                  label: "Delete",
                  destructive: true,
                  onSelect: () => void cloud.remove(project.tile),
                },
              ]}
            />
          ),
        )}
        <li>
          <NewProjectCard userId={userId} />
        </li>
      </ul>
    </>
  );
}

// With the name row under it, this makes a project card about square.
const THUMBNAIL = "aspect-[7/6]";

function NewProjectCard({ userId }: { userId: string }) {
  return (
    <NewProjectButton
      userId={userId}
      className={cn(
        pixelifySans.className,
        "group relative flex aspect-square h-full w-full items-center justify-center gap-2.5 rounded-xl bg-background text-lg text-accent-pink transition-colors hover:bg-pastel-pink-soft focus-visible:bg-pastel-pink-soft",
      )}
    >
      {/* CSS dashes are too short at this width; the design has long ones. */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 size-full overflow-visible text-[#eba9c0] transition-colors group-hover:text-accent-pink"
      >
        <rect
          width="100%"
          height="100%"
          rx="12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 5"
        />
      </svg>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-5">
        <path
          d="M8 2v12M2 8h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      New project
    </NewProjectButton>
  );
}
