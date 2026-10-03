"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { IconButton } from "@pigxel/ui/components/button";
import { EmptyState } from "@pigxel/ui/components/empty-state";
import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { loadPopularTiles } from "../actions";
import { PERIODS, type Period } from "../constants";
import { TabLinks } from "@/components/ui/tab-links";
import type { PublicTile } from "@/features/profile/profile";
import { scrollParent } from "@/lib/utils/scroll-parent";
import { PopularCard } from "./popular-card/popular-card";
import { SignInBanner } from "./sign-in-banner";
import styles from "./gallery.module.css";

const PRELOAD = "1500px";

export function PopularFeed({
  period,
  initial,
  count,
  guest,
}: {
  period: Period;
  initial: PublicTile[];
  count: number;
  guest: boolean;
}) {
  const [tiles, setTiles] = useState(initial);
  const [density, setDensity] = useState<"comfortable" | "compact">(
    "comfortable",
  );
  const [offset, setOffset] = useState(initial.length);
  const [done, setDone] = useState(initial.length >= count);
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
          <Heading as="h1" id="popular-heading">
            Popular tiles
          </Heading>
          <Badge
            tone="muted"
            className="text-xs text-primary-soft-foreground tabular-nums"
          >
            {count}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <TabLinks
            label="Period"
            variant="segmented"
            tabs={PERIODS.map((p) => ({
              href: `/explore?period=${p.value}`,
              label: p.label,
              active: p.value === period,
            }))}
          />
          <div
            aria-label="Gallery density"
            role="group"
            className={cn(styles.density, "gap-1 border-l pl-4")}
          >
            {(["comfortable", "compact"] as const).map((value) => (
              <IconButton
                key={value}
                label={
                  value === "comfortable" ? "Larger previews" : "Compact grid"
                }
                size="md"
                aria-pressed={density === value}
                onClick={() => setDensity(value)}
                className="size-9"
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
              </IconButton>
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
