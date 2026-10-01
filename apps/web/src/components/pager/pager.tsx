import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { pageNumbers } from "./helpers";

/** Previous, the page numbers and next; `href` gives each page's address. */
export function Pager({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  const step = (to: number, label: string, enabled: boolean) => (
    <Link
      href={href(to)}
      aria-disabled={!enabled}
      tabIndex={enabled ? undefined : -1}
      className={cn(
        buttonVariants({ variant: "secondary" }),
        !enabled && "pointer-events-none opacity-50",
      )}
    >
      {label}
    </Link>
  );
  return (
    <nav
      aria-label="Pages"
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {step(page - 1, "Previous", page > 1)}
      {pageNumbers(page, pages).map((n, i) =>
        n === null ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-current={n === page ? "page" : undefined}
            className={cn(
              buttonVariants({ variant: n === page ? "primary" : "ghost" }),
              "min-w-10 tabular-nums",
            )}
          >
            {n}
          </Link>
        ),
      )}
      {step(page + 1, "Next", page < pages)}
    </nav>
  );
}
