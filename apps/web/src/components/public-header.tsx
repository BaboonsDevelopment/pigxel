import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Brand } from "@/components/brand";

/** The light header of pages open to everyone, with the way in. */
export function PublicHeader() {
  return (
    <header className="shrink-0 border-b bg-background">
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
  );
}
