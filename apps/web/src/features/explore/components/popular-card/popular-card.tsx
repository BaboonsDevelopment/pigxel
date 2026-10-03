"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { PublicTile } from "@/lib/profile/profile";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { HoverOverlay } from "@/components/tiles/hover-overlay";
import { LikeButton } from "./components/like-button";
import { PreviewDialog } from "./components/preview-dialog";
import { PixelImage } from "@/components/ui/pixel-image";

export function PopularCard({ tile }: { tile: PublicTile }) {
  const { author } = tile;
  const [previewing, setPreviewing] = useState(false);
  const picture = useRef<HTMLButtonElement>(null);
  return (
    <li className="min-w-0">
      <button
        type="button"
        ref={picture}
        aria-label={`Preview ${tile.name}`}
        onClick={() => setPreviewing(true)}
        className="group relative block w-full overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow outline-none hover:shadow-md"
      >
        <span className="relative block aspect-[16/10] overflow-hidden bg-checker">
          <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-focus-visible:scale-105 group-focus-visible:blur-[2px] motion-reduce:transition-none">
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
          <HoverOverlay label="Preview" />
        </span>
      </button>
      <div className="pt-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate font-mono text-sm" title={tile.name}>
            {tile.name}
          </h3>
          <LikeButton tileId={tile.id} count={tile.likes} liked={tile.liked} />
        </div>
        <Link
          href={`/u/${author.username}`}
          className="mt-0.5 flex w-fit max-w-full items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <ProfileAvatar
            name={author.name}
            url={author.avatarUrl}
            className="size-5 shrink-0 text-[9px]"
          />
          <span className="truncate">{author.username}</span>
        </Link>
      </div>
      {previewing && (
        <PreviewDialog
          tile={tile}
          origin={() => picture.current?.getBoundingClientRect()}
          onClose={() => setPreviewing(false)}
        />
      )}
    </li>
  );
}
