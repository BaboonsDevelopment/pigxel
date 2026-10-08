"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { HoverOverlay } from "../hover-overlay";
import { ProjectMenu } from "./components/project-menu";

export function ProjectCard({
  name,
  thumbnail,
  open,
  opening = false,
  busyLabel = "Opening…",
  disabled = false,
  menu,
  meta,
}: {
  name: string;
  thumbnail: ReactNode;
  open: { href: string } | { onClick: () => void };
  opening?: boolean;
  busyLabel?: string;
  disabled?: boolean;
  menu: Parameters<typeof ProjectMenu>[0]["items"];
  meta?: ReactNode;
}) {
  const face = (
    <span
      className={`relative block ${meta ? "aspect-[204/165]" : "aspect-[16/10]"} overflow-hidden bg-checker`}
    >
      <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:blur-[2px] motion-reduce:transition-none [&>*]:size-full [&>*]:object-cover [&>*]:[image-rendering:pixelated]">
        {thumbnail}
      </span>
      <HoverOverlay label={opening ? busyLabel : "Open"} force={opening} />
    </span>
  );
  const openLabel = `Open ${name}`;
  return (
    <li className="group relative overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md">
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
        <ProjectMenu
          label={`More for ${name}`}
          items={menu}
          disabled={disabled}
        />
      </div>
    </li>
  );
}
