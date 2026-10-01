"use client";

import Link from "next/link";
import { useReducer } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { listDrafts, type Draft } from "@/lib/pigxel-file/draft";
import { parsePigxel, type PigxelDocument } from "@/lib/pigxel-file/format";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useIsClient } from "@/lib/use-is-client";
import {
  confirmRemoveLocalTile,
  useCloudTileActions,
} from "@/components/tiles/tile-actions";
import { ProjectCard } from "@/components/tiles/project-card/project-card";
import { TileThumbnail } from "@/components/tiles/tile-thumbnail";

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

/** Local tiles and cloud tiles in one row, most recently changed first. */
function merge(userId: string, cloudTiles: CloudTileSummary[]): Project[] {
  const local = listDrafts(userId).flatMap((draft): Project[] => {
    // A cloud tile open here is listed once, as the cloud tile.
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

/** Home's "Recent projects": the latest few tiles, then a "New project" card. */
export function RecentProjects(props: {
  userId: string;
  cloudTiles: CloudTileSummary[];
  limit: number;
}) {
  // Local tiles live in this browser's storage, so the row waits for the client.
  if (!useIsClient()) return <div className="min-h-44" />;
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
  // Local tiles are read from storage each render; this re-renders after removing one.
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
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {projects.map((project) =>
          project.kind === "local" ? (
            <ProjectCard
              key={project.id}
              name={project.name}
              thumbnail={<TileThumbnail image={project.image} />}
              open={{ href: editorUrl(project.id) }}
              menu={[
                {
                  label:
                    project.draft.location?.kind === "drive"
                      ? "Remove from this browser"
                      : "Delete",
                  destructive: true,
                  onSelect: () => {
                    if (confirmRemoveLocalTile(userId, project.draft))
                      refresh();
                  },
                },
              ]}
            />
          ) : (
            <ProjectCard
              key={project.id}
              name={project.name}
              thumbnail={
                project.tile.thumbnail && (
                  // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
                  <img src={project.tile.thumbnail} alt="" decoding="async" />
                )
              }
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
          <NewProjectCard />
        </li>
      </ul>
    </>
  );
}

function NewProjectCard() {
  return (
    <Link
      href="/tiles/new"
      className="flex h-full min-h-32 items-center justify-center gap-2.5 rounded-xl border bg-card font-mono text-sm tracking-wide transition-colors hover:border-[#f7cfdc] hover:bg-[#fde2ea] focus-visible:bg-[#fde2ea]"
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4">
        <path
          d="M8 2v12M2 8h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
      New project
    </Link>
  );
}
