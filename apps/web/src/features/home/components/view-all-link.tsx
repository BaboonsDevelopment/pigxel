import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";

const STYLES = {
  text: "text-sm font-medium text-accent-pink hover:underline",
  pill: "inline-flex h-8 items-center rounded-lg border border-accent-pink/30 bg-card px-3 text-sm font-medium text-accent-pink shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition-colors hover:border-accent-pink/60 hover:bg-pastel-pink-soft",
};

/** "View all →" on the home sections: plain text, or a pill on cards. */
export function ViewAllLink({
  href,
  variant = "text",
  className,
}: {
  /** Without one the section has no page yet, and it shows as coming soon. */
  href?: string;
  variant?: keyof typeof STYLES;
  className?: string;
}) {
  const label = (
    <>
      View all <span aria-hidden="true">→</span>
    </>
  );
  if (!href)
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className={cn(STYLES[variant], "cursor-default", className)}
      >
        {label}
      </span>
    );
  return (
    <Link href={href} className={cn(STYLES[variant], className)}>
      {label}
    </Link>
  );
}
