import { cn } from "@pigxel/ui/lib/utils";
import styles from "./premium.module.css";

/**
 * Marks something premium with a small dark pill and a crown: glowing when
 * this person can use it, greyed out when it needs a paid plan. Hovering it
 * spells out "Premium".
 */
export function PremiumCrown({
  locked,
  className,
}: {
  locked: boolean;
  className?: string;
}) {
  const label = locked ? "Premium: needs a paid plan" : "Premium";
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "group/premium inline-flex h-5 items-center rounded-full bg-[#3d3539]/75 px-1 text-[10px] leading-none font-semibold text-white shadow-sm backdrop-blur-sm",
        className,
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 9 9"
        shapeRendering="crispEdges"
        className={cn(styles.crown, locked && styles.locked, "size-3 shrink-0")}
        fill="currentColor"
      >
        {/* A pixel crown, a row clear above and below so it sits centred. */}
        <path d="M0 1h1v1h1v1H0Zm4 0h1v1h1v1H3V2h1Zm4 0h1v2H7V2h1ZM0 3h9v3H0Zm0 4h9v1H0Z" />
      </svg>
      <span
        aria-hidden="true"
        className="max-w-0 overflow-hidden whitespace-nowrap transition-[max-width,padding] duration-200 group-hover/premium:max-w-14 group-hover/premium:pr-0.5 group-hover/premium:pl-1 motion-reduce:transition-none"
      >
        Premium
      </span>
    </span>
  );
}
