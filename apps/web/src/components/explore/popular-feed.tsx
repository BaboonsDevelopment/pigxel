"use client";

import { useEffect, useRef, useState } from "react";
import { loadPopularTiles } from "@/app/(app)/explore/actions";
import type { Period } from "@/app/(app)/explore/constants";
import type { PublicTile } from "@/lib/profile/profile";
import { scrollParent } from "@/lib/scroll-parent";
import { PopularCard } from "./popular-card/popular-card";
import { SignInBanner } from "./sign-in-banner";

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
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <PopularCard key={tile.id} tile={tile} />
        ))}
      </ul>
      {banner && (
        <SignInBanner
          onClose={() => {
            setBanner(false);
            setAllowed(true);
          }}
        />
      )}
      {!done && <div ref={sentinel} aria-hidden="true" className="h-px" />}
    </>
  );
}
