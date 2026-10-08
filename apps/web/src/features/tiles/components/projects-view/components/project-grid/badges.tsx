import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";
import type { Label } from "../../../../labels";

export function PinBadge() {
  return (
    <span
      aria-label="Pinned"
      className="flex size-6 items-center justify-center rounded-md border border-black/5 bg-white/95 text-primary shadow-sm"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 9 9"
        shapeRendering="crispEdges"
        className="size-4"
      >
        <path d="M2 0h5v2H6v2h2v1H5v4H4V5H1V4h2V2H2Z" fill="currentColor" />
        <path d="M3 0h1v2H3Z" fill="#fff" fillOpacity=".55" />
      </svg>
    </span>
  );
}

export function PublishedBadge() {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-6 items-center gap-1 rounded-md border border-primary/20 bg-primary px-2 text-xs text-primary-foreground shadow-sm",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 7 7"
        shapeRendering="crispEdges"
        className="size-2.5"
      >
        <path
          d="M2 0h3v1h1v1h1v3H6v1H5v1H2V6H1V5H0V2h1V1h1Z"
          fill="currentColor"
        />
      </svg>
      Published
    </span>
  );
}

export function LabelBadge({ label }: { label: Label }) {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-6 max-w-28 items-center truncate rounded-md border border-black/5 px-2 text-xs text-[#3b2a33] shadow-sm",
      )}
      style={{ background: label.color }}
    >
      {label.name}
    </span>
  );
}
