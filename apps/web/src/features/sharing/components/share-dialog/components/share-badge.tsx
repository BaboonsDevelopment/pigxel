import { cn } from "@pigxel/ui/lib/utils";
import { pixelifySans } from "@/lib/fonts/pixelify";

const TONES = {
  owner: "bg-primary text-primary-foreground",
  invited: "bg-pastel-peach text-foreground",
  link: "bg-pastel-lavender text-lavender-foreground",
};

export function ShareBadge({
  tone,
  children,
}: {
  tone: keyof typeof TONES;
  children: string;
}) {
  return (
    <span
      className={cn(
        pixelifySans.className,
        "flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] leading-none",
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}
