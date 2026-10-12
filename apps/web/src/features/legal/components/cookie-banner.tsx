"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import {
  onOpenCookieSettings,
  openCookieSettings,
  saveCookieChoice,
  useCookieChoice,
} from "../consent";

/**
 * Asks once whether embedded videos may load. Both choices are equally easy;
 * nothing optional loads until one is made.
 */
export function CookieBanner() {
  const choice = useCookieChoice();
  const [reopened, setReopened] = useState(false);
  useEffect(() => onOpenCookieSettings(() => setReopened(true)), []);

  if (choice === undefined || (choice && !reopened)) return null;
  const decide = (media: boolean) => {
    saveCookieChoice({ media });
    setReopened(false);
  };
  return (
    <section
      role="region"
      aria-label="Cookie choices"
      className="fixed inset-x-4 bottom-4 z-[60] mx-auto max-w-xl rounded-2xl border bg-card p-4 text-sm shadow-lg sm:p-5"
    >
      <p className="font-semibold">Cookies on Pigxel</p>
      <p className="mt-1.5 text-muted-foreground">
        We only use cookies Pigxel needs to work, like keeping you signed in.
        Tutorial videos come from YouTube, which sets its own cookies when you
        play one. Allow them?{" "}
        <Link href="/cookies" className="underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="md" onClick={() => decide(true)}>
          Allow videos
        </Button>
        <Button size="md" variant="secondary" onClick={() => decide(false)}>
          Only necessary
        </Button>
        {choice && (
          <Button size="md" variant="ghost" onClick={() => setReopened(false)}>
            Keep my choice
          </Button>
        )}
      </div>
    </section>
  );
}

/** A link-styled button that reopens the banner. */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={openCookieSettings}>
      Cookie settings
    </button>
  );
}
