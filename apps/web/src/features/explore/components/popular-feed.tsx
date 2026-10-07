"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { loadPopularTiles, loadTagCounts } from "../actions";
import {
  PAGE_SIZE,
  PERIODS,
  SIZES,
  SORTS,
  type Period,
  type Size,
  type Sort,
} from "../constants";
import type { PublicTile } from "@/features/profile/profile";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { ExploreHeader } from "./explore-header/explore-header";
import { PopularCard } from "./popular-card/popular-card";
import { SignInBanner } from "./sign-in-banner";
import styles from "./gallery.module.css";

const PRELOAD = "1500px";

export function PopularFeed({
  period,
  tags: initialTags,
  size: initialSize,
  animated: initialAnimated,
  tagCounts: initialTagCounts,
  initial,
  count: initialCount,
  guest,
  failed: initialFailed = false,
}: {
  period: Period;
  tags: string[];
  size: Size;
  animated: boolean;
  tagCounts: Record<string, number> | null;
  initial: PublicTile[];
  count: number;
  guest: boolean;
  /** The first page couldn't be loaded. */
  failed?: boolean;
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [size, setSize] = useState(initialSize);
  const [animated, setAnimated] = useState(initialAnimated);
  const [tagCounts, setTagCounts] = useState(initialTagCounts);
  const [tiles, setTiles] = useState(initial);
  const [count, setCount] = useState(initialCount);
  const [failed, setFailed] = useState(initialFailed);
  const [pending, startTransition] = useTransition();
  const request = useRef(0);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length >= initialCount);
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
      const current = request.current;
      try {
        const { tiles: more } = await loadPopularTiles(
          period,
          offset,
          tags,
          size,
          animated,
        );
        if (current !== request.current) return;
        if (!more.length || offset + more.length >= count) setDone(true);
        setOffset(offset + more.length);
        if (guest) setAllowed(false);
        setTiles((all) => {
          const shown = new Set(all.map((t) => t.id));
          return [...all, ...more.filter((t) => !shown.has(t.id))];
        });
      } catch {
        if (current === request.current) setMoreFailed(true);
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
  }, [
    period,
    tags,
    size,
    animated,
    offset,
    count,
    done,
    guest,
    allowed,
    moreFailed,
  ]);

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

  const applyFilters = (next: {
    tags?: string[];
    size?: Size;
    animated?: boolean;
  }) => {
    const nextTags = next.tags ?? tags;
    const nextSize = next.size ?? size;
    const nextAnimated = next.animated ?? animated;
    const params = new URLSearchParams();
    if (period !== PERIODS[0].value) params.set("period", period);
    if (nextTags.length) params.set("tag", nextTags.join(","));
    if (nextSize !== SIZES[0].value) params.set("size", nextSize);
    if (nextAnimated) params.set("animated", "1");
    const url = params.size ? `/explore?${params}` : "/explore";
    window.history.replaceState(null, "", url);
    setTags(nextTags);
    setSize(nextSize);
    setAnimated(nextAnimated);
    const current = ++request.current;
    startTransition(async () => {
      try {
        const [first, counts] = await Promise.all([
          loadPopularTiles(period, 0, nextTags, nextSize, nextAnimated),
          nextSize === size && nextAnimated === animated
            ? tagCounts
            : loadTagCounts(period, nextSize, nextAnimated).catch(() => null),
        ]);
        if (current !== request.current) return;
        setTagCounts(counts);
        setTiles(first.tiles);
        setCount(first.count);
        setOffset(first.tiles.length);
        setDone(first.tiles.length >= first.count);
        setFailed(false);
      } catch {
        if (current !== request.current) return;
        setTiles([]);
        setDone(true);
        setFailed(true);
      }
      setMoreFailed(false);
    });
  };

  const clear = () => {
    setSort(SORTS[0].value);
    setQuery("");
    if (period !== PERIODS[0].value) router.push("/explore", { scroll: false });
    else if (tags.length || size !== SIZES[0].value || animated)
      applyFilters({ tags: [], size: SIZES[0].value, animated: false });
  };

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
        tags={tags}
        tagCounts={tagCounts}
        onTagsChange={(next) => applyFilters({ tags: next })}
        size={size}
        onSizeChange={(next) => applyFilters({ size: next })}
        animated={animated}
        onAnimatedChange={(next) => applyFilters({ animated: next })}
        onClear={clear}
        sort={sort}
        onSortChange={setSort}
        query={query}
        onQueryChange={setQuery}
        guest={guest}
      />
      <div
        aria-busy={pending}
        className={`transition-opacity duration-200 ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {shown.length ? (
          <ul className={styles.grid}>
            {shown.map((tile, i) => (
              <PopularCard
                key={tile.id}
                tile={tile}
                delay={(i % PAGE_SIZE) * 30}
              />
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
              tags.length === 1
                ? `No ${tags[0]!.toLowerCase()} arts yet`
                : tags.length
                  ? "No arts with these tags yet"
                  : "No tiles in this period"
            }
            description={
              tags.length
                ? "Try other tags to discover more from the community."
                : "Try a different period to discover more from the community."
            }
            className="border-solid bg-[#faf9fa]"
          />
        )}
      </div>
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
