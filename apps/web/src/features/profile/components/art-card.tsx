import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import type { ProfileTile } from "../profile";
import { PixelImage } from "@/components/ui/pixel-image";
import { Badge } from "@pigxel/ui/components/badge";
import { Text } from "@pigxel/ui/components/typography";

export function ArtCard({
  tile,
  isOwner,
  error,
  onTogglePublic,
  onTogglePin,
}: {
  tile: ProfileTile;
  isOwner: boolean;
  error?: string;
  onTogglePublic: () => void;
  onTogglePin: () => void;
}) {
  const isPublic = tile.visibility === "public";
  return (
    <li className="flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl border bg-checker">
        {tile.thumbnail ? (
          <PixelImage
            src={tile.thumbnail}
            alt={tile.name}
            loading="lazy"
            className="size-full object-cover"
          />
        ) : (
          <Text
            as="span"
            size="xs"
            tone="muted"
            className="flex size-full items-center justify-center"
          >
            No preview
          </Text>
        )}
        {isOwner && (
          <Badge
            tone={isPublic ? "primary" : "overlay"}
            size="md"
            className="absolute top-2 left-2 transition-colors"
          >
            {isPublic ? "Public" : "Private"}
          </Badge>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-medium" title={tile.name}>
        {tile.name}
      </p>
      <Text size="xs" tone="muted" className="tabular-nums">
        {tile.width} × {tile.height}
      </Text>
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
