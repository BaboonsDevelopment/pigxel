import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

/** Marks a tileset: art built from a tilemap layer, or a tile asset. */
export function TilesBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-6 items-center gap-1 rounded-md border border-black/5 bg-pastel-mint px-2 text-xs text-foreground shadow-sm",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 7 7"
        shapeRendering="crispEdges"
        className="size-2.5"
      >
        <path
          d="M0 0h3v3H0ZM4 0h3v3H4ZM0 4h3v3H0ZM4 4h3v3H4Z"
          fill="currentColor"
        />
      </svg>
      Tiles
    </span>
  );
}
