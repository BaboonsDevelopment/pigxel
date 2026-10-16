import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";

export function SectionHeader({
  id,
  title,
  count,
  className,
  onViewAll,
  action,
}: {
  id: string;
  title: string;
  count: string;
  className?: string;
  onViewAll?: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex items-center gap-3.5">
        <h2
          id={id}
          className={cn(
            madimiOne.className,
            "text-[28px] leading-tight tracking-[0.02em] text-[#4a2434]",
          )}
        >
          {title}
        </h2>
        <span className="flex size-8 items-center justify-center rounded-full border border-[#f0dde5] bg-background text-xs text-[#4a1f35] tabular-nums">
          {count}
        </span>
      </div>
      {action}
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="flex cursor-pointer items-center gap-1.5 text-xs text-primary transition-colors hover:text-primary-hover"
        >
          View all
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-3.5"
          >
            <path d="M3 8h10M9 4l4 4-4 4" />
          </svg>
        </button>
      )}
    </div>
  );
}
