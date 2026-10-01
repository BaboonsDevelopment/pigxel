import Link from "next/link";
import type { PublicTile } from "@/lib/profile/profile";
import { ProfileAvatar } from "@/components/profile/profile-avatar";
import { HoverOverlay } from "@/components/tiles/hover-overlay";
import { LikeButton } from "./components/like-button";

/** A published art on Explore: its author on top, its name and likes below. */
export function PopularCard({ tile }: { tile: PublicTile }) {
  const { author } = tile;
  return (
    <li className="group relative overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-shadow hover:shadow-md">
      {/* Preview does nothing yet. */}
      <button
        type="button"
        aria-label={`Preview ${tile.name}`}
        className="block w-full outline-none"
      >
        <span className="relative block aspect-[16/10] overflow-hidden bg-checker">
          <span className="block size-full transition duration-300 ease-out group-hover:scale-105 group-hover:blur-[2px] group-hover:brightness-90 group-has-[:focus-visible]:scale-105 group-has-[:focus-visible]:blur-[2px] motion-reduce:transition-none">
            {tile.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element -- a tiny data URL
              <img
                src={tile.thumbnail}
                alt=""
                decoding="async"
                loading="lazy"
                className="size-full object-cover [image-rendering:pixelated]"
              />
            )}
          </span>
          <HoverOverlay label="Preview" />
        </span>
      </button>
      <Link
        href={`/u/${author.username}`}
        className="absolute top-2 right-2 flex max-w-[calc(100%-1rem)] items-center gap-1.5 rounded-full bg-background/90 py-0.5 pr-2.5 pl-0.5 text-xs font-medium shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
      >
        <ProfileAvatar
          name={author.name}
          url={author.avatarUrl}
          className="size-5 text-[10px]"
        />
        <span className="truncate">@{author.username}</span>
      </Link>
      <div className="flex h-9 items-center justify-between gap-2 border-t pr-1 pl-3">
        <span className="truncate font-mono text-sm">{tile.name}</span>
        <LikeButton tileId={tile.id} count={tile.likes} liked={tile.liked} />
      </div>
    </li>
  );
}
