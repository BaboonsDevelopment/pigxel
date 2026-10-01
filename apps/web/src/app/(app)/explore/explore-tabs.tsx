"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";

const TABS = [
  { href: "/explore/popular", label: "Popular" },
  { href: "/explore/profile", label: "Profile" },
];

/**
 * Explore's sections as one bordered group of tabs; a highlight slides to
 * the tab chosen (the layout, and so this, stays while the page changes).
 */
export function ExploreTabs() {
  const path = usePathname();
  const tabs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const active = TABS.findIndex((tab) => path === tab.href);

  useLayoutEffect(() => {
    const tab = tabs.current[active];
    if (!tab) return setHighlight(null);
    const measure = () =>
      setHighlight({ left: tab.offsetLeft, width: tab.offsetWidth });
    measure();
    // The tab grows once its font has loaded; the highlight follows.
    const observer = new ResizeObserver(measure);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [active]);

  return (
    <nav
      aria-label="Explore"
      className="relative inline-flex overflow-hidden rounded-xl border bg-background shadow-sm"
    >
      {highlight && (
        <span
          aria-hidden="true"
          style={highlight}
          className="absolute inset-y-0 bg-primary transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
        />
      )}
      {TABS.map((tab, i) => (
        <Link
          key={tab.href}
          ref={(el) => {
            tabs.current[i] = el;
          }}
          href={tab.href}
          aria-current={i === active ? "page" : undefined}
          className={cn(
            "relative px-7 py-2 font-display text-2xl tracking-tight whitespace-nowrap transition-colors duration-300",
            i > 0 && "border-l",
            i === active ? "text-primary-foreground" : "text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
