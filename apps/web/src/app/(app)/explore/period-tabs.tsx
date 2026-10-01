"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import { PERIODS, type Period } from "./constants";

/**
 * The span of time popular arts are drawn from, as one bordered group of
 * tabs; a highlight slides to the one chosen.
 */
export function PeriodTabs({ active }: { active: Period }) {
  const tabs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const index = PERIODS.findIndex((period) => period.value === active);

  useLayoutEffect(() => {
    const tab = tabs.current[index];
    if (!tab) return setHighlight(null);
    const measure = () =>
      setHighlight({ left: tab.offsetLeft, width: tab.offsetWidth });
    measure();
    // The tab grows once its font has loaded; the highlight follows.
    const observer = new ResizeObserver(measure);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [index]);

  return (
    <nav
      aria-label="Period"
      className="relative inline-flex overflow-hidden rounded-lg border bg-background shadow-sm"
    >
      {highlight && (
        <span
          aria-hidden="true"
          style={highlight}
          className="absolute inset-y-0 bg-primary transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
        />
      )}
      {PERIODS.map((period, i) => (
        <Link
          key={period.value}
          ref={(el) => {
            tabs.current[i] = el;
          }}
          href={`/explore/popular?period=${period.value}`}
          aria-current={i === index ? "page" : undefined}
          className={cn(
            "relative px-4 py-1 font-display text-base tracking-tight whitespace-nowrap transition-colors duration-300",
            i > 0 && "border-l",
            i === index ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {period.label}
        </Link>
      ))}
    </nav>
  );
}
