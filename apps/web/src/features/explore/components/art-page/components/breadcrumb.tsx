"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};

function headerSlot() {
  const target = document.getElementById("app-header-start");
  return target && getComputedStyle(target).display !== "none" ? target : null;
}

export function Breadcrumb({ name }: { name: string }) {
  const slot = useSyncExternalStore(subscribe, headerSlot, () => null);

  const nav = (
    <nav
      aria-label="Breadcrumb"
      className="flex min-w-0 shrink-0 items-center gap-2 text-xs"
    >
      <Link
        href="/explore"
        className="flex items-center gap-2 whitespace-nowrap transition-colors hover:text-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-3.5"
        >
          <path d="M13 8H3M7 4 3 8l4 4" />
        </svg>
        Back to Explore
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        /
      </span>
      <span aria-current="page" className="truncate text-muted-foreground">
        {name}
      </span>
    </nav>
  );

  return slot ? createPortal(nav, slot) : <div className="mb-4">{nav}</div>;
}
