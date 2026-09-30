import type { ReactNode } from "react";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Brand } from "@/components/brand";
import { LEGAL_LINKS } from "@/lib/legal";

/**
 * Pages anyone can read, signed in or not: pricing and the policies. A
 * light header with the way in, and a footer linking them all.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-6">
          <Brand />
          <nav aria-label="Main" className="ml-auto flex items-center gap-2">
            <Link
              href="/pricing"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              Log in
            </Link>
            <Link
              href="/login?mode=signup"
              className={buttonVariants({ size: "sm" })}
            >
              Start creating
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Pigxel</span>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-foreground hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
