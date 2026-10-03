"use client";

import { useEffect, useRef, useState } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { loadCloudTiles } from "../actions";
import { PAGE_SIZE } from "../constants";
import type { CloudTileSummary } from "@/lib/pigxel-file/cloud";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { ProjectCard } from "./project-card/project-card";
import { useCloudTileActions } from "../tile-actions";
import { PixelImage } from "@/components/ui/pixel-image";
import { Heading } from "@pigxel/ui/components/typography";

const PRELOAD = "1500px";

export function CloudTiles({
  userId,
  initial,
}: {
  userId: string;
  initial: CloudTileSummary[];
}) {
  const { busy, error, removed, open, remove } = useCloudTileActions(userId);
  const [tiles, setTiles] = useState(initial);
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length < PAGE_SIZE);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (done || !target) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadCloudTiles(offset);
        if (more.length < PAGE_SIZE) setDone(true);
        setOffset(offset + more.length);
        setTiles((all) => {
          const shown = new Set(all.map((t) => t.id));
          return [...all, ...more.filter((t) => !shown.has(t.id))];
        });
      } finally {
        loading.current = false;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) void loadMore();
      },
      { root: scrollParent(target), rootMargin: `0px 0px ${PRELOAD} 0px` },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [offset, done]);

  const visible = tiles.filter((tile) => !removed.has(tile.id));
  if (visible.length === 0) return null;
  return (
    <section aria-labelledby="cloud-tiles-heading" className="mt-6">
      <Heading id="cloud-tiles-heading" className="mb-3">
        In Pigxel cloud
      </Heading>
      {error && (
        <FormMessage tone="error" className="mb-4">
          {error}
        </FormMessage>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {visible.map((tile) => (
          <ProjectCard
            key={tile.id}
            name={tile.name}
            thumbnail={
              tile.thumbnail && <PixelImage src={tile.thumbnail} alt="" />
            }
            open={{ onClick: () => void open(tile) }}
            opening={busy === tile.id}
            disabled={busy !== null}
            menu={[
              {
                label: "Delete",
                destructive: true,
                onSelect: () => void remove(tile),
              },
            ]}
          />
        ))}
      </ul>
      {!done && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </section>
  );
}
