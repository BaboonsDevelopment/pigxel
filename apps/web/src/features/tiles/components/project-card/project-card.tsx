"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";
import { HoverOverlay } from "../hover-overlay";
import type { SortProps } from "../projects-view/drag/use-sortable";
import { ProjectMenu } from "./components/project-menu";

export function ProjectCard({
  name,
  thumbnail,
  open,
  opening = false,
  busyLabel = "Opening…",
  openLabel: hoverLabel = "Open",
  disabled = false,
  menu,
  meta,
  badges,
  selected,
  onPointerDown,
  dragging = false,
  corner,
  sort,
}: {
  name: string;
  thumbnail: ReactNode;
  open: { href: string } | { onClick: () => void };
  opening?: boolean;
  busyLabel?: string;
  openLabel?: string;
  disabled?: boolean;
  menu: Parameters<typeof ProjectMenu>[0]["items"];
  meta?: ReactNode;
  badges?: ReactNode;
  selected?: boolean;
  onPointerDown?: (event: PointerEvent) => void;
  dragging?: boolean;
  corner?: ReactNode;
  sort?: SortProps;
}) {
  const { lifted, ...sortProps } = sort ?? { lifted: false };
  const face = (
    <span
      className={`relative block ${meta ? "aspect-[204/165]" : "aspect-[16/10]"} overflow-hidden bg-checker`}
    >
      <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:blur-[2px] motion-reduce:transition-none [&>*]:size-full [&>*]:object-cover [&>*]:[image-rendering:pixelated]">
        {thumbnail}
      </span>
      {selected === undefined ? (
        <HoverOverlay
          label={opening ? busyLabel : hoverLabel}
          force={opening}
        />
      ) : (
        <span
          aria-hidden="true"
          className={`absolute top-2 right-2 flex size-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors ${selected ? "border-primary bg-primary text-primary-foreground" : "border-white bg-white/80"}`}
        >
          {selected && (
            <svg viewBox="0 0 12 12" className="size-3.5">
              <path
                d="m2.5 6.2 2.3 2.3 4.7-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
      )}
      {badges && (
        <span className="pointer-events-none absolute top-2 left-2 flex max-w-[calc(100%-1rem)] flex-wrap items-center gap-1">
          {badges}
        </span>
      )}
    </span>
  );
  const openLabel =
    selected === undefined
      ? `${hoverLabel} ${name}`
      : `${selected ? "Deselect" : "Select"} ${name}`;
  return (
    <li
      onPointerDown={onPointerDown}
      onDragStart={(event) => {
        if (onPointerDown || sort) event.preventDefault();
      }}
      style={dragging ? { opacity: 0.35, scale: "0.96" } : undefined}
      {...sortProps}
      className={`group relative overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md ${selected ? "ring-2 ring-primary" : ""} ${lifted ? "shadow-xl" : ""}`}
    >
      {"href" in open ? (
        <Link
          href={open.href}
          aria-label={openLabel}
          className="block outline-none"
        >
          {face}
        </Link>
      ) : (
        <button
          type="button"
          aria-label={openLabel}
          disabled={disabled}
          onClick={open.onClick}
          className="block w-full outline-none"
        >
          {face}
        </button>
      )}
      {corner && selected === undefined && (
        <div className="absolute top-2 right-2 z-10">{corner}</div>
      )}
      <div
        className={
          meta
            ? "flex items-center justify-between gap-2 border-t py-1.5 pr-1 pl-3"
            : "flex h-9 items-center justify-between gap-2 border-t pr-1 pl-3"
        }
      >
        {meta ? (
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">
              {meta}
            </span>
          </span>
        ) : (
          <span className="truncate font-mono text-sm">{name}</span>
        )}
        {selected === undefined && (
          <ProjectMenu
            label={`More for ${name}`}
            items={menu}
            disabled={disabled}
          />
        )}
      </div>
    </li>
  );
}
