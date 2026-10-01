import type { ReactNode } from "react";
import Link from "next/link";
import { PublicHeader } from "@/components/public-header/public-header";
import { getUser } from "@/lib/auth/session";
import { LEGAL_LINKS } from "@/lib/legal";

/**
 * The policies, open to everyone: the public header (with the way back into
 * the app for people who are signed in) and a footer linking them all.
 */
export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <PublicHeader signedIn={Boolean(user)} />

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
