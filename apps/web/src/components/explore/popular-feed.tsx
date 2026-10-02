"use client";

import { useEffect, useRef, useState } from "react";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { cn } from "@pigxel/ui/lib/utils";
import { loadPopularTiles } from "@/app/(app)/explore/actions";
import { PeriodTabs } from "@/app/(app)/explore/period-tabs";
import type { Period } from "@/app/(app)/explore/constants";
import type { PublicTile } from "@/lib/profile/profile";
import { scrollParent } from "@/lib/scroll-parent";
import { PopularCard } from "./popular-card/popular-card";
import { SignInBanner } from "./sign-in-banner";
import styles from "./gallery.module.css";

/** How far below the visible part the next arts start loading, so scrolling never waits. */
const PRELOAD = "1500px";

/** Popular arts that keep loading as you scroll, until there are no more. */
export function PopularFeed({
  period,
  initial,
  count,
  guest,
}: {
  period: Period;
  initial: PublicTile[];
  /** How many there are in all. */
  count: number;
  /** Signed out: past the first arts, a bar asks them to sign in. */
  guest: boolean;
}) {
  const [tiles, setTiles] = useState(initial);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  // How many have been fetched; ahead of tiles.length when ranks shifted.
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length >= count);
  // A guest who reaches the end gets the sign-in bar, and the page stops
  // scrolling; closing it lets the next arts load, until the next end.
  const [banner, setBanner] = useState(false);
  const [allowed, setAllowed] = useState(!guest);
  const loading = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = sentinel.current;
    if (done || !target) return;
    const loadMore = async () => {
      if (loading.current) return;
      loading.current = true;
      try {
        const more = await loadPopularTiles(period, offset);
        if (!more.length || offset + more.length >= count) setDone(true);
        setOffset(offset + more.length);
        if (guest) setAllowed(false);
        // Ranks shift as likes come in; an art already shown stays put.
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
        if (!entry?.isIntersecting) return;
        if (allowed) void loadMore();
        else setBanner(true);
      },
      {
        root: scrollParent(target),
        // A guest's bar waits until they really reach the end.
        rootMargin: `0px 0px ${guest ? "0px" : PRELOAD} 0px`,
      },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [period, offset, count, done, guest, allowed]);

  useEffect(() => {
    if (!banner) return;
    const scroller = scrollParent(sentinel.current);
    const element = scroller ?? document.documentElement;
    const { overflowY, scrollbarGutter } = element.style;
    // Keeps the scrollbar's room, so the arts don't jump sideways.
    element.style.scrollbarGutter = "stable";
    element.style.overflowY = "hidden";
    return () => {
      element.style.overflowY = overflowY;
      element.style.scrollbarGutter = scrollbarGutter;
    };
  }, [banner]);

  return (
    <section aria-labelledby="popular-heading" className={styles.gallery}>
      <div className="sticky top-0 z-20 mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-2 border-b bg-background/95 py-2 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <h1
            id="popular-heading"
            className="font-display text-xl tracking-tight"
          >
            Popular tiles
          </h1>
          <span
            className={cn(
              "rounded bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums text-primary-soft-foreground",
            )}
          >
            {count}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <PeriodTabs active={period} />
          <div
            aria-label="Gallery density"
            role="group"
            className={cn(styles.density, "gap-1 border-l pl-4")}
          >
            {(["comfortable", "compact"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-label={
                  value === "comfortable" ? "Larger previews" : "Compact grid"
                }
                title={
                  value === "comfortable" ? "Larger previews" : "Compact grid"
                }
                aria-pressed={density === value}
                onClick={() => setDensity(value)}
                className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted aria-pressed:bg-primary aria-pressed:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="size-4"
                >
                  {Array.from(
                    { length: value === "comfortable" ? 4 : 9 },
                    (_, i) => {
                      const columns = value === "comfortable" ? 2 : 3;
                      const size = columns === 2 ? 7 : 4;
                      const step = columns === 2 ? 10 : 6.5;
                      return (
                        <rect
                          key={i}
                          x={1.5 + (i % columns) * step}
                          y={1.5 + Math.floor(i / columns) * step}
                          width={size}
                          height={size}
                          rx="0"
                        />
                      );
                    },
                  )}
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
      {tiles.length ? (
        <ul className={styles.grid} data-density={density}>
          {tiles.map((tile) => (
            <PopularCard key={tile.id} tile={tile} />
          ))}
        </ul>
      ) : (
        <EmptyState
          title="No tiles in this period"
          description="Try a different period to discover more from the community."
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
      {!done && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </section>
  );
}
