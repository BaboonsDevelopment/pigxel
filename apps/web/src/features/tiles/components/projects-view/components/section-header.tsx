import { Heading } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";

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
      <div className="flex items-center gap-[18px]">
        <Heading id={id} className="text-[28px] leading-tight font-semibold">
          {title}
        </Heading>
        <span className="flex h-[22px] min-w-[41px] items-center justify-center rounded-full bg-[#f3edf0] px-2.5 text-xs text-muted-foreground tabular-nums">
          {count}
        </span>
      </div>
      {action}
      {onViewAll && (
        <button
          type="button"
          onClick={onViewAll}
          className="flex items-center gap-1.5 text-xs text-link-accent transition-colors hover:text-lavender-foreground"
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
