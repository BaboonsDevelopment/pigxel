"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CloudError, readPublishedTile } from "@/lib/pigxel-file/cloud";
import { editorUrl } from "@/lib/pigxel-file/open-tile";
import { recordDownload } from "@/features/explore/actions";
import type { SavedArt } from "@/features/explore/server";
import { remixArt } from "@/features/explore/remix";
import { DownloadDialog } from "./download-dialog";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { FormMessage } from "@pigxel/ui/components/field";
import { PixelImage } from "@/components/ui/pixel-image";
import { useSavedArts, useUnsaveArt } from "../../../queries/saved-arts";
import { ProjectCard } from "../../project-card/project-card";
import { SectionHeader } from "./section-header";

export function Favourites({
  userId,
  query,
  searched,
  grid,
}: {
  userId: string;
  query: string;
  searched: string;
  grid: string;
}) {
  const router = useRouter();
  const [remixing, setRemixing] = useState<string | null>(null);
  const [remixError, setRemixError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<SavedArt | null>(null);

  const remix = async (art: SavedArt) => {
    setRemixing(art.id);
    setRemixError(null);
    try {
      const file = await readPublishedTile({
        id: art.id,
        userId: art.authorId,
      });
      router.push(editorUrl(await remixArt(userId, art, file)));
    } catch (e) {
      setRemixError(
        e instanceof CloudError
          ? e.message
          : "Couldn’t open this art in the editor. Try again.",
      );
      setRemixing(null);
    }
  };
  const { arts, count, loaded, hasMore, loadMore } = useSavedArts(searched);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (!hasMore || !target) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { root: scrollParent(target), rootMargin: "0px 0px 1500px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);
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
        count={String(count)}
        className="mb-3"
      />
      {(unsave.error ?? remixError) && (
        <FormMessage tone="error" className="mb-4">
          {unsave.error?.message ?? remixError}
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
              opening={remixing === art.id}
              disabled={remixing !== null}
              menu={[
                ...(art.allowRemix
                  ? [{ label: "Remix", onSelect: () => void remix(art) }]
                  : []),
                { label: "Download…", onSelect: () => setDownloading(art) },
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
      {hasMore && <div ref={sentinel} aria-hidden="true" className="h-px" />}
      {downloading && (
        <DownloadDialog
          name={downloading.name}
          tileId={downloading.id}
          authorId={downloading.authorId}
          withFile={downloading.allowRemix}
          onDownload={() => void recordDownload(downloading.id)}
          onClose={() => setDownloading(null)}
        />
      )}
    </section>
  );
}
