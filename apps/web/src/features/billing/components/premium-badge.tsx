import { cn } from "@pigxel/ui/lib/utils";
import styles from "./premium.module.css";

/** Marks a feature that comes with the paid plans. */
export function PremiumBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        styles.flow,
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white shadow-sm",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3"
        fill="currentColor"
      >
        <path d="M8 0c.4 3.9 2.1 5.6 6 6-3.9.4-5.6 2.1-6 6-.4-3.9-2.1-5.6-6-6 3.9-.4 5.6-2.1 6-6Z" />
      </svg>
      Premium
    </span>
  );
}
