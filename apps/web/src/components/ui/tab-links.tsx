"use client";

import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import {
  tabListVariants,
  tabVariants,
  type TabsSize,
  type TabsVariant,
} from "@pigxel/ui/components/tabs";

type TabLink = { href: string; label: string; active: boolean };

export function TabLinks({
  label,
  tabs,
  variant = "underline",
  size = "md",
  className,
}: {
  label: string;
  tabs: TabLink[];
  variant?: TabsVariant;
  size?: TabsSize;
  className?: string;
}) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [highlight, setHighlight] = useState<{
    left: number;
    width: number;
  } | null>(null);
  const index = tabs.findIndex((tab) => tab.active);
  const sliding = variant === "segmented";

  useLayoutEffect(() => {
    const tab = refs.current[index];
    if (!sliding || !tab) return setHighlight(null);
    const measure = () =>
      setHighlight({ left: tab.offsetLeft, width: tab.offsetWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(tab);
    return () => observer.disconnect();
  }, [index, sliding]);

  return (
    <nav aria-label={label} className={tabListVariants({ variant, className })}>
      {sliding && highlight && (
        <span
          aria-hidden="true"
          style={highlight}
          className="absolute inset-y-0 bg-primary transition-[left,width] duration-300 ease-out motion-reduce:transition-none"
        />
      )}
      {tabs.map((tab, i) => (
        <Link
          key={tab.href}
          ref={(el) => {
            refs.current[i] = el;
          }}
          href={tab.href}
          scroll={false}
          aria-current={tab.active ? "page" : undefined}
          className={tabVariants({
            variant,
            size,
            active: tab.active,
            highlighted: sliding && highlight !== null,
          })}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
