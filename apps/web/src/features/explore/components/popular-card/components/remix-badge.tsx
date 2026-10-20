import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

/** Marks an art remixed from another one. */
export function RemixBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-6 items-center rounded-md border border-black/5 bg-pastel-pink px-2 text-xs text-foreground shadow-sm",
        className,
      )}
    >
      Remix
    </span>
  );
}
