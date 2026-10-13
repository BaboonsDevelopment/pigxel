import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

export function ReviewBadge() {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-6 items-center rounded-md border border-black/5 bg-pastel-peach px-2 text-xs text-foreground shadow-sm",
      )}
    >
      In review
    </span>
  );
}
