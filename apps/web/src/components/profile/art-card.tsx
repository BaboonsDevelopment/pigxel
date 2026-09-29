import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import type { ProfileTile } from "@/lib/profile/profile";

/** One art on a profile; its owner can publish and pin it from here. */
export function ArtCard({
  tile,
  isOwner,
  error,
  onTogglePublic,
  onTogglePin,
}: {
  tile: ProfileTile;
  isOwner: boolean;
  /** Why the last change to this art didn't go through. */
  error?: string;
  onTogglePublic: () => void;
  onTogglePin: () => void;
}) {
  const isPublic = tile.visibility === "public";
  return (
    <li className="flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-checker">
        {tile.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element -- a small data URL kept with the tile
          <img
            src={tile.thumbnail}
            alt={tile.name}
            loading="lazy"
            decoding="async"
            className="size-full object-contain [image-rendering:pixelated]"
          />
        ) : (
          <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
            No preview
          </span>
        )}
        {isOwner && (
          <span
            className={cn(
              "absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors",
              isPublic
                ? "bg-primary text-primary-foreground"
                : "bg-background/90 text-muted-foreground",
            )}
          >
            {isPublic ? "Public" : "Private"}
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium" title={tile.name}>
        {tile.name}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {tile.width} × {tile.height}
      </p>
      {isOwner && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTogglePublic}
          >
            {isPublic ? "Make private" : "Publish"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onTogglePin}
          >
            {tile.pinOrder ? "Unpin" : "Pin"}
          </Button>
        </div>
      )}
      {error && (
        <FormMessage tone="error" className="mt-1.5 text-xs">
          {error}
        </FormMessage>
      )}
    </li>
  );
}
