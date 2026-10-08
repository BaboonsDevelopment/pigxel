"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { formatCount } from "@/features/explore/components/popular-card/helpers";
import { useArtStats } from "../../../queries/art-stats";
import { STAT_KEYS, totalStats } from "../../../stats";
import { StatIcon, STATS } from "./stat-icons";
import { StatsIcon } from "./stats-icon";

const WIDTH = 176;
const CLOSE_DELAY = 120;

const CORNER =
  "flex size-7 cursor-default items-center justify-center rounded-md border border-black/5 bg-white/95 text-foreground opacity-0 shadow-sm transition group-hover:opacity-100 hover:text-primary focus-visible:opacity-100 aria-expanded:text-primary aria-expanded:opacity-100";

const TOOLBAR =
  "flex size-10 shrink-0 cursor-default items-center justify-center rounded-lg border bg-background text-foreground transition-colors hover:bg-muted aria-expanded:bg-muted";

export function StatsHover({
  tile,
}: {
  tile: { id: string; name: string } | null;
}) {
  const button = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [place, setPlace] = useState<{ top: number; left: number } | null>(
    null,
  );

  const show = () => {
    if (timer.current) clearTimeout(timer.current);
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    setPlace({
      top: rect.bottom + 6,
      left: Math.max(
        8,
        Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8),
      ),
    });
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPlace(null), CLOSE_DELAY);
  };

  useEffect(() => {
    if (!place) return;
    const close = () => setPlace(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [place]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={tile ? `Statistics for ${tile.name}` : "Statistics"}
        aria-expanded={place !== null}
        onPointerEnter={show}
        onPointerLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={tile ? CORNER : TOOLBAR}
      >
        <StatsIcon className={tile ? "size-4" : "size-[18px]"} />
      </button>
      {place &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: place.top, left: place.left, width: WIDTH }}
            onPointerEnter={show}
            onPointerLeave={hide}
            className="fixed z-50 rounded-lg border bg-popover p-1.5 text-xs text-popover-foreground shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
          >
            <StatsList tileId={tile?.id ?? null} />
          </div>,
          document.body,
        )}
    </>
  );
}

function StatsList({ tileId }: { tileId: string | null }) {
  const stats = useArtStats(tileId);
  if (stats.isPending)
    return <p className="px-2 py-1.5 text-muted-foreground">Loading…</p>;
  if (stats.isError)
    return (
      <p className="px-2 py-1.5 text-muted-foreground">
        Couldn’t load statistics.
      </p>
    );
  if (!stats.data.length)
    return (
      <p className="px-2 py-1.5 text-muted-foreground">
        Nothing published to Explore yet.
      </p>
    );
  const art = totalStats(stats.data);
  return (
    <ul>
      {tileId === null && (
        <li className="px-2 pt-1 pb-1.5 text-[10px] text-muted-foreground">
          {stats.data.length === 1
            ? "Across 1 published art"
            : `Across ${stats.data.length} published arts`}
        </li>
      )}
      {STAT_KEYS.map((stat) => (
        <li
          key={stat}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground"
        >
          <StatIcon stat={stat} />
          {STATS[stat].label}
          <span className="ml-auto font-semibold text-foreground tabular-nums">
            {formatCount(art[stat])}
          </span>
        </li>
      ))}
    </ul>
  );
}
