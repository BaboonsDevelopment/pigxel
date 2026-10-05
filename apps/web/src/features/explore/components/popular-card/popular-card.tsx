"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@pigxel/ui/lib/utils";
import type { PublicTile } from "@/features/profile/profile";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { HoverOverlay } from "@/features/tiles/components/hover-overlay";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { LikeButton } from "./components/like-button";
import { PixelImage } from "@/components/ui/pixel-image";
import { inter } from "@/lib/fonts/inter";
import { manrope } from "@/lib/fonts/manrope";

export function PopularCard({ tile }: { tile: PublicTile }) {
  const { author } = tile;
  const router = useRouter();
  const href = `/explore/${tile.id}`;
  return (
    <li className="group min-w-0 overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md">
      <Link
        href={href}
        aria-label={`Open ${tile.name}`}
        className="relative block w-full outline-none"
      >
        <span className="relative block aspect-[5/4] overflow-hidden bg-checker">
          <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:blur-[2px] motion-reduce:transition-none">
            {tile.thumbnail ? (
              <PixelImage
                src={tile.thumbnail}
                alt=""
                loading="lazy"
                className="size-full object-contain"
              />
            ) : (
              <span className="flex size-full items-center justify-center font-mono text-xs text-muted-foreground">
                No preview yet
              </span>
            )}
          </span>
          <HoverOverlay label="Open project" />
        </span>
      </Link>
      <div className={cn(manrope.className, "px-3 pt-2 pb-3 text-[#4a1f35]")}>
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-xl leading-tight" title={tile.name}>
            {tile.name}
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
            ]}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Link
            href={`/u/${author.username}`}
            className="flex min-w-0 items-center gap-1 rounded-sm text-xs transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <ProfileAvatar
              name={author.name}
              url={author.avatarUrl}
              className="size-3.5 shrink-0 text-[7px]"
            />
            <span className="truncate">{author.username}</span>
          </Link>
          <div
            className={cn(
              inter.className,
              "flex shrink-0 items-center gap-1 text-[10px] leading-[1.25] tabular-nums",
            )}
          >
            <LikeButton
              tileId={tile.id}
              count={tile.likes}
              liked={tile.liked}
            />
            <span aria-hidden="true">·</span>
            <span aria-label="Downloads" className="flex items-center gap-1">
              <svg
                aria-hidden="true"
                viewBox="1.25 1.25 13.5 13"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-2 w-2"
              >
                <path d="M8 2v8.5M4.5 7 8 10.5 11.5 7M2 10.5V12a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 14 12v-1.5" />
              </svg>
              0
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
