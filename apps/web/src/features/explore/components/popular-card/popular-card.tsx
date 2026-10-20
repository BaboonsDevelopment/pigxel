"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@pigxel/ui/lib/utils";
import type { PublicTile } from "@/features/profile/profile";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { HoverOverlay } from "@/features/tiles/components/hover-overlay";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { Highlighted } from "./components/highlighted";
import { LikeButton } from "./components/like-button";
import { PixelImage } from "@/components/ui/pixel-image";
import { formatCount } from "./helpers";
import { inter } from "@/lib/fonts/inter";
import { manrope } from "@/lib/fonts/manrope";
import { TilesBadge } from "@/features/tiles/components/tiles-badge";
import { RemixBadge } from "./components/remix-badge";

export function PopularCard({
  tile,
  words = [],
  delay = 0,
  menu = [],
}: {
  tile: PublicTile;
  words?: string[];
  delay?: number;
  menu?: { label: string; onSelect: () => void; destructive?: boolean }[];
}) {
  const { author } = tile;
  const router = useRouter();
  const href = `/explore/${tile.id}`;
  // Remixes are named "<original> (remix)"; the badge says that instead.
  const name = tile.isRemix ? tile.name.replace(/ \(remix\)$/, "") : tile.name;
  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="group min-w-0 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow [animation-fill-mode:both] hover:shadow-md motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300"
    >
      <Link
        href={href}
        aria-label={`Open ${tile.name}`}
        className="relative block w-full outline-none"
      >
        <span className="relative block aspect-square overflow-hidden bg-canvas">
          <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:blur-[2px] motion-reduce:transition-none">
            {tile.thumbnail ? (
              <PixelImage
                src={tile.thumbnail}
                alt=""
                loading="lazy"
                className="size-full object-contain p-3"
              />
            ) : (
              <span className="flex size-full items-center justify-center font-mono text-xs text-muted-foreground">
                No preview yet
              </span>
            )}
          </span>
          <HoverOverlay label="Open project" />
          {tile.tilemap && (
            <TilesBadge className="pointer-events-none absolute top-2 left-2" />
          )}
          {tile.isRemix && (
            <RemixBadge className="pointer-events-none absolute top-2 right-2" />
          )}
        </span>
      </Link>
      <div className={cn(manrope.className, "px-3 pt-2 pb-3 text-[#4a1f35]")}>
        <div className="flex items-center justify-between gap-2">
          <h3
            className="truncate text-[15px] leading-tight font-semibold"
            title={name}
          >
            <Highlighted text={name} words={words} />
          </h3>
          <ProjectMenu
            label={`More for ${tile.name}`}
            icon={
              <svg
                aria-hidden="true"
                viewBox="0 0 20 4"
                className="w-4 text-[#4a1f35]"
              >
                <circle cx="2" cy="2" r="2" fill="currentColor" />
                <circle cx="10" cy="2" r="2" fill="currentColor" />
                <circle cx="18" cy="2" r="2" fill="currentColor" />
              </svg>
            }
            items={[
              { label: "Open", onSelect: () => router.push(href) },
              {
                label: "View profile",
                onSelect: () => router.push(`/u/${author.username}`),
              },
              ...menu,
            ]}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Link
            href={`/u/${author.username}`}
            className="flex min-w-0 items-center gap-1.5 rounded-sm text-[13px] text-[#6b4a5a] transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ProfileAvatar
              name={author.name}
              url={author.avatarUrl}
              className="size-4 shrink-0"
            />
            <span className="truncate">
              <Highlighted text={author.username} words={words} />
            </span>
          </Link>
          <div
            className={cn(
              inter.className,
              "flex shrink-0 items-center gap-1.5 text-xs leading-[1.25] text-[#6b4a5a] tabular-nums",
            )}
          >
            <LikeButton
              tileId={tile.id}
              count={tile.likes}
              liked={tile.liked}
            />
            {tile.downloads > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  aria-label="Downloads"
                  className="flex items-center gap-1"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="1.25 1.25 13.5 13"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-2.5"
                  >
                    <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12v-1.5" />
                  </svg>
                  {formatCount(tile.downloads)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
