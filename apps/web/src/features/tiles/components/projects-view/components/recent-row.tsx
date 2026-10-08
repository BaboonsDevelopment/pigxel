"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { useDraftsLoaded } from "@/lib/pigxel-file/use-drafts";
import { PixelImage } from "@/components/ui/pixel-image";
import { readMarks } from "../../../local-marks";
import { TileThumbnail } from "../../tile-thumbnail";
import { editedAgo, readLocalProjects } from "../helpers";
import { SectionHeader } from "./section-header";

const SHOWN = 6;

type Recent = {
  id: string;
  name: string;
  at: number;
  thumbnail: ReactNode;
  open: { href: string } | { onClick: () => void };
};

export function RecentRow({
  userId,
  cloud,
  busy,
  onOpen,
}: {
  userId: string;
  cloud: CloudTileSummary[];
  busy: string | null;
  onOpen: (tile: CloudTileSummary) => void;
}) {
  const loaded = useDraftsLoaded(userId);
  if (!loaded) return null;
  return (
    <RecentList userId={userId} cloud={cloud} busy={busy} onOpen={onOpen} />
  );
}

function RecentList({
  userId,
  cloud,
  busy,
  onOpen,
}: {
  userId: string;
  cloud: CloudTileSummary[];
  busy: string | null;
  onOpen: (tile: CloudTileSummary) => void;
}) {
  const [local] = useState(() => {
    const opened = readMarks(userId, "opened");
    const archived = readMarks(userId, "archived");
    return readLocalProjects(userId).flatMap((project) =>
      project.kind === "local" && opened[project.id] && !archived[project.id]
        ? [{ project, at: opened[project.id]! }]
        : [],
    );
  });

  const items: Recent[] = [
    ...cloud.flatMap((tile): Recent[] =>
      tile.openedAt
        ? [
            {
              id: tile.id,
              name: tile.name,
              at: Date.parse(tile.openedAt),
              thumbnail: tile.thumbnail && (
                <PixelImage src={tile.thumbnail} alt="" />
              ),
              open: { onClick: () => onOpen(tile) },
            },
          ]
        : [],
    ),
    ...local.flatMap(({ project, at }): Recent[] =>
      project.kind === "local"
        ? [
            {
              id: project.id,
              name: project.name,
              at,
              thumbnail: <TileThumbnail image={project.image} />,
              open: { href: editorUrl(project.id) },
            },
          ]
        : [],
    ),
  ]
    .sort((a, b) => b.at - a.at)
    .slice(0, SHOWN);

  if (!items.length) return null;

  return (
    <section aria-labelledby="recent-heading" className="mb-[35px]">
      <SectionHeader
        id="recent-heading"
        title="Recently opened"
        count={String(items.length)}
        className="mb-4"
      />
      <ul className="-mx-1 flex gap-4 overflow-x-auto px-1 pt-1 pb-3">
        {items.map((item) => {
          const face = (
            <>
              <span className="block aspect-[4/3] overflow-hidden bg-checker [&>*]:size-full [&>*]:object-cover [&>*]:[image-rendering:pixelated]">
                {item.thumbnail}
              </span>
              <span className="block border-t px-2.5 py-1.5 text-left">
                <span className="block truncate text-xs font-semibold">
                  {item.name}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  {busy === item.id
                    ? "Opening…"
                    : `Opened ${editedAgo(item.at)}`}
                </span>
              </span>
            </>
          );
          const className =
            "block w-full cursor-pointer overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow outline-none hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/40";
          return (
            <li key={item.id} className="w-40 shrink-0">
              {"href" in item.open ? (
                <Link
                  href={item.open.href}
                  aria-label={`Open ${item.name}`}
                  className={className}
                >
                  {face}
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label={`Open ${item.name}`}
                  disabled={busy !== null}
                  onClick={item.open.onClick}
                  className={className}
                >
                  {face}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
