"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { loadPopularTiles } from "../actions";
import type { Period, Sort } from "../constants";
import type { PublicTile } from "@/features/profile/profile";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { ExploreHeader } from "./explore-header/explore-header";
import { PopularCard } from "./popular-card/popular-card";
import { SignInBanner } from "./sign-in-banner";
import styles from "./gallery.module.css";

const PRELOAD = "1500px";

export function PopularFeed({
  period,
  tag,
  initial,
  count,
  guest,
  failed = false,
}: {
  period: Period;
  tag: string | null;
  initial: PublicTile[];
  count: number;
  guest: boolean;
  /** The first page couldn't be loaded. */
  failed?: boolean;
}) {
  const [tiles, setTiles] = useState(initial);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length >= count);
  const [banner, setBanner] = useState(false);
  const [allowed, setAllowed] = useState(!guest);
  const [moreFailed, setMoreFailed] = useState(false);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (done || moreFailed || !target) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadPopularTiles(period, offset, tag);
        if (!more.length || offset + more.length >= count) setDone(true);
        setOffset(offset + more.length);
        if (guest) setAllowed(false);
        setTiles((all) => {
          const shown = new Set(all.map((t) => t.id));
          return [...all, ...more.filter((t) => !shown.has(t.id))];
        });
      } catch {
        setMoreFailed(true);
      } finally {
        loading.current = false;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        if (allowed) void loadMore();
        else setBanner(true);
      },
      {
        root: scrollParent(target),
        rootMargin: `0px 0px ${guest ? "0px" : PRELOAD} 0px`,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [period, tag, offset, count, done, guest, allowed, moreFailed]);

  useEffect(() => {
    if (!banner) return;
    const scroller = scrollParent(sentinel.current);
    const element = scroller ?? document.documentElement;
    const { overflowY, scrollbarGutter } = element.style;
    element.style.scrollbarGutter = "stable";
    element.style.overflowY = "hidden";
    return () => {
      element.style.overflowY = overflowY;
      element.style.scrollbarGutter = scrollbarGutter;
    };
  }, [banner]);

  const search = query.trim().toLowerCase();
  const found = tiles.filter(
    (t) =>
      (!search || t.name.toLowerCase().includes(search)) &&
      (sort !== "liked" || t.liked),
  );
  const shown =
    sort === "recent"
      ? [...found].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      : sort === "az"
        ? [...found].sort((a, b) => a.name.localeCompare(b.name))
        : found;

  return (
    <section aria-labelledby="popular-heading" className={styles.gallery}>
      <ExploreHeader
        period={period}
        tag={tag}
        sort={sort}
        onSortChange={setSort}
        query={query}
        onQueryChange={setQuery}
        guest={guest}
      />
      {shown.length ? (
        <ul className={styles.grid}>
          {shown.map((tile) => (
            <PopularCard key={tile.id} tile={tile} />
          ))}
        </ul>
      ) : tiles.length ? (
        <EmptyState
          title={
            sort === "liked" && !search
              ? "No liked arts yet"
              : "Nothing matches your search"
          }
          description={
            sort === "liked" && !search
              ? "Tap the heart on any art to keep it here."
              : "Try a different name."
          }
          className="border-solid bg-[#faf9fa]"
        />
      ) : failed ? (
        <EmptyState
          title="Couldn’t load popular tiles"
          description="Refresh the page to try again."
          className="border-solid bg-[#faf9fa]"
        />
      ) : (
        <EmptyState
          title={
            tag ? `No ${tag.toLowerCase()} arts yet` : "No tiles in this period"
          }
          description={
            tag
              ? "Try another tag to discover more from the community."
              : "Try a different period to discover more from the community."
          }
          className="border-solid bg-[#faf9fa]"
        />
      )}
      {banner && (
        <SignInBanner
          onClose={() => {
            setBanner(false);
            setAllowed(true);
          }}
        />
      )}
      {moreFailed && (
        <p role="alert" className="mt-6 text-center text-sm">
          Couldn’t load more tiles.{" "}
          <Button
            variant="link"
            className="text-sm"
            onClick={() => setMoreFailed(false)}
          >
            Try again
          </Button>
        </p>
      )}
      {!done && !moreFailed && (
        <div ref={sentinel} aria-hidden="true" className="h-px" />
      )}
    </section>
  );
}
