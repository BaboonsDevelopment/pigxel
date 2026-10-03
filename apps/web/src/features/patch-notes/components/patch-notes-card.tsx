import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { PATCH_NOTES, patchDate } from "../patch-notes";
import { ChevronRightIcon, SparklesIcon } from "@/components/ui/icons";

export function PatchNotesCard({
  active,
  onNavigate,
}: {
  active: boolean;
  onNavigate?: () => void;
}) {
  const latest = PATCH_NOTES[0];
  if (!latest) return null;
  return (
    <Link
      href="/patch-notes"
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title="Patch notes"
      className={cn(
        "mx-3 mb-3 flex items-center gap-3 rounded-xl border bg-white/70 p-2 shadow-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2",
        active && "border-primary/50 bg-white",
      )}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        <SparklesIcon />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          v{latest.version} is out
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          What’s new ·{" "}
          <time dateTime={latest.date}>{patchDate(latest.date, true)}</time>
        </span>
      </span>
      <ChevronRightIcon />
    </Link>
  );
}
