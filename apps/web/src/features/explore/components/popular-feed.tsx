"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { loadArtists, loadPopularTiles, loadTagCounts } from "../actions";
import {
  NO_FILTERS,
  PAGE_SIZE,
  PERIODS,
  SIZES,
  SORTS,
  type ExploreFilters,
} from "../constants";
import type { PublicTile } from "@/features/profile/profile";
import type { ArtistResult } from "@/features/search/server";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { saveFeedOrder } from "../feed-order";
import { ExploreHeader } from "./explore-header/explore-header";
import { ArtistMatches } from "./artist-matches";
import { PopularCard } from "./popular-card/popular-card";
import { searchWords } from "./popular-card/helpers";
import { SignInBanner } from "./sign-in-banner";
import styles from "./gallery.module.css";

const PRELOAD = "1500px";
const TYPING_PAUSE = 300;

export function PopularFeed({
  filters: initialFilters,
  tagCounts: initialTagCounts,
  artists: initialArtists,
  initial,
  count: initialCount,
  guest,
  failed: initialFailed = false,
}: {
  filters: ExploreFilters;
  tagCounts: Record<string, number> | null;
  artists: ArtistResult[];
  initial: PublicTile[];
  count: number;
  guest: boolean;
  /** The first page couldn't be loaded. */
  failed?: boolean;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const applied = useRef(initialFilters);
  const [typed, setTyped] = useState(initialFilters.query);
  const typing = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [tagCounts, setTagCounts] = useState(initialTagCounts);
  const [artists, setArtists] = useState(initialArtists);
  const [tiles, setTiles] = useState(initial);
  const [count, setCount] = useState(initialCount);
  const [failed, setFailed] = useState(initialFailed);
  const [pending, startTransition] = useTransition();
  const request = useRef(0);
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
        const { tiles: more } = await loadPopularTiles(offset, filters);
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
  }, [filters, offset, count, done, guest, allowed, moreFailed]);

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

  useEffect(() => () => clearTimeout(typing.current), []);

  const applyFilters = (patch: Partial<ExploreFilters>) => {
    clearTimeout(typing.current);
    const previous = applied.current;
    const next = { ...previous, ...patch };
    applied.current = next;
    const params = new URLSearchParams();
    if (next.period !== PERIODS[0].value) params.set("period", next.period);
    if (next.query) params.set("q", next.query);
    if (next.tags.length) params.set("tag", next.tags.join(","));
    if (next.size !== SIZES[0].value) params.set("size", next.size);
    if (next.animated) params.set("animated", "1");
    if (next.sort !== SORTS[0].value) params.set("sort", next.sort);
    if (next.feed !== NO_FILTERS.feed) params.set("feed", next.feed);
    const url = params.size ? `/explore?${params}` : "/explore";
    window.history.replaceState(null, "", url);
    setFilters(next);
    const sameCounts =
      next.size === previous.size &&
      next.animated === previous.animated &&
      next.query === previous.query &&
      next.period === previous.period &&
      next.feed === previous.feed &&
      (next.sort === "liked") === (previous.sort === "liked");
    const current = ++request.current;
    startTransition(async () => {
      try {
        const [first, counts, people] = await Promise.all([
          loadPopularTiles(0, next),
          sameCounts ? tagCounts : loadTagCounts(next).catch(() => null),
          next.query === previous.query
            ? artists
            : next.query
              ? loadArtists(next.query).catch(() => [])
              : [],
        ]);
        if (current !== request.current) return;
        setTagCounts(counts);
        setArtists(people);
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

  const type = (value: string) => {
    setTyped(value);
    clearTimeout(typing.current);
    const query = value.trim();
    if (query === applied.current.query) return;
    typing.current = setTimeout(
      () => applyFilters({ query }),
      query ? TYPING_PAUSE : 0,
    );
  };

  const clear = () => {
    setTyped("");
    clearTimeout(typing.current);
    applyFilters({ ...NO_FILTERS, feed: applied.current.feed });
  };

  useEffect(() => {
    saveFeedOrder({
      ids: tiles.map((t) => t.id),
      filters,
      count,
      url: window.location.pathname + window.location.search,
    });
  }, [tiles, filters, count]);

  const { query, tags } = filters;
  const words = searchWords(query);
  const narrowed =
    tags.length > 0 || filters.size !== SIZES[0].value || filters.animated;
  const { sort } = filters;

  return (
    <section aria-labelledby="popular-heading" className={styles.gallery}>
      <ExploreHeader
        period={filters.period}
        onPeriodChange={(next) => applyFilters({ period: next })}
        feed={filters.feed}
        onFeedChange={(next) => applyFilters({ feed: next })}
        tags={tags}
        tagCounts={tagCounts}
        onTagsChange={(next) => applyFilters({ tags: next })}
        size={filters.size}
        onSizeChange={(next) => applyFilters({ size: next })}
        animated={filters.animated}
        onAnimatedChange={(next) => applyFilters({ animated: next })}
        onClear={clear}
        sort={sort}
        onSortChange={(next) => applyFilters({ sort: next })}
        query={typed}
        onQueryChange={type}
        onQuerySubmit={() => applyFilters({ query: typed.trim() })}
        searching={pending && typed.trim() !== ""}
        guest={guest}
      />
      <div
        aria-busy={pending}
        className={`transition-opacity duration-200 ${pending ? "pointer-events-none opacity-50" : ""}`}
      >
        {query && (
          <div className="-mt-6 mb-6 space-y-4">
            <p
              role="status"
              className="animate-in text-sm text-muted-foreground fade-in"
            >
              {failed ? (
                "Search didn’t work this time."
              ) : (
                <>
                  <span className="font-semibold text-foreground tabular-nums">
                    {count}
                  </span>{" "}
                  {count === 1 ? "art" : "arts"} for “
                  <span className="text-foreground">{query}</span>”
                  {narrowed && " with your filters"}
                </>
              )}
            </p>
            {artists.length > 0 && (
              <ArtistMatches artists={artists} words={words} />
            )}
          </div>
        )}
        {tiles.length ? (
          <ul className={styles.grid}>
            {tiles.map((tile, i) => (
              <PopularCard
                key={tile.id}
                tile={tile}
                words={words}
                delay={(i % PAGE_SIZE) * 30}
              />
            ))}
          </ul>
        ) : failed ? (
          <EmptyState
            title={
              query
                ? "Couldn’t search right now"
                : "Couldn’t load popular tiles"
            }
            description="Refresh the page to try again."
            className="border-solid bg-[#faf9fa]"
          />
        ) : sort === "liked" && !query ? (
          <EmptyState
            title={
              guest
                ? "Sign in to see arts you liked"
                : narrowed
                  ? "No liked arts match these filters"
                  : "No liked arts yet"
            }
            description={
              guest
                ? "Your liked arts are kept with your account."
                : "Tap the heart on any art to keep it here."
            }
            className="border-solid bg-[#faf9fa]"
          />
        ) : filters.feed === "following" && !query ? (
          <EmptyState
            title={
              guest
                ? "Sign in to see arts from people you follow"
                : narrowed
                  ? "No arts from people you follow match these filters"
                  : "No arts from people you follow yet"
            }
            description={
              guest
                ? "Follow artists you like, and their new arts show up here."
                : "Follow artists from their art page or profile, and their arts show up here."
            }
            className="border-solid bg-[#faf9fa]"
          />
        ) : query ? (
          <EmptyState
            title={`Nothing found for “${query}”`}
            description={
              narrowed
                ? "Try removing some filters, or check the spelling."
                : "Check the spelling, or try a shorter or more general word."
            }
            action={
              narrowed ? (
                <Button
                  variant="secondary"
                  onClick={() =>
                    applyFilters({
                      tags: [],
                      size: SIZES[0].value,
                      animated: false,
                    })
                  }
                >
                  Search without filters
                </Button>
              ) : undefined
            }
            className="border-solid bg-[#faf9fa]"
          />
        ) : (
          <EmptyState
            title={
              tags.length === 1
                ? `No ${tags[0]!.toLowerCase()} arts yet`
                : tags.length
                  ? "No arts with these tags yet"
                  : "No arts yet"
            }
            description={
              tags.length
                ? "Try other tags to discover more from the community."
                : "Published arts from the community will show up here."
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
