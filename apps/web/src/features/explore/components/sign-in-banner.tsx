"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { buttonVariants } from "@pigxel/ui/components/button";

export function SignInBanner({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div
      role="region"
      aria-label="Sign in"
      className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-3 motion-safe:animate-in motion-safe:slide-in-from-bottom"
    >
      <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-background p-3 pl-5 shadow-2xl">
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Like what you see?</span>{" "}
          <span className="text-muted-foreground">
            Log in to like arts and make your own.
          </span>
        </p>
        <Link
          href="/login?mode=signup"
          className={buttonVariants({ size: "sm" })}
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Log in
        </Link>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-lg leading-none text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          ×
        </button>
      </div>
    </div>,
    document.body,
  );
}
