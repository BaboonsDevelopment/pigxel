"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { geist } from "@/lib/fonts";
import styles from "./public-header.module.css";

const LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/pricing", label: "Pricing" },
];

/**
 * The header of every page open to everyone (the landing; Explore and
 * Pricing for guests; the policies), as a floating pill like Mobbin's: the
 * mascot on the left, a few links on the right, and "Join for free" sliding in
 * once the page's opening section has scrolled up behind the bar: the
 * element marked `data-header-reveal`, or else the first thing in <main>.
 * Signed-in visitors get "Open Pigxel" instead of Log in, from the start.
 * Page transitions keep the header still (it's named "site-header", see
 * app/transitions.css).
 */
export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname();
  const bar = useRef<HTMLDivElement>(null);
  // Remembers which page it measured, so a new page starts with the bar short.
  const [reveal, setReveal] = useState({ path: "", past: false });
  const joinShown = reveal.path === pathname && reveal.past;

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const opening =
        document.querySelector("[data-header-reveal]") ??
        document.querySelector("main > *");
      const barBottom = bar.current?.getBoundingClientRect().bottom ?? 0;
      const past = opening
        ? opening.getBoundingClientRect().bottom <= barBottom
        : false;
      const path = window.location.pathname;
      setReveal((old) =>
        old.path === path && old.past === past ? old : { path, past },
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    // Pages scroll the window or, in the app's layout, a container; scroll
    // events don't bubble, so catch them on the way down instead.
    document.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule);
    // A page can open part-way down, and every new page needs measuring.
    schedule();
    return () => {
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return (
    <header className={`${geist.variable} ${styles.header}`}>
      {/* Named here rather than on <header>: a named element is a backdrop
          root, and on the wrapper it would leave the pill nothing to blur. */}
      <div
        ref={bar}
        className={styles.bar}
        data-join={joinShown || signedIn || undefined}
        style={{ viewTransitionName: "site-header" }}
      >
        <Link href="/" className={styles.logo} aria-label="Pigxel home">
          <BrandMascot className={styles.logoIcon} priority />
          <span className={styles.wordmark} aria-hidden="true">
            Pigxel
          </span>
        </Link>
        <nav aria-label="Main" className={styles.links}>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          {!signedIn && <Link href="/login">Log in</Link>}
        </nav>
        {signedIn ? (
          <Link href="/home" className={styles.join} data-shown>
            Open Pigxel
          </Link>
        ) : (
          <Link
            href="/login?mode=signup"
            className={styles.join}
            data-shown={joinShown || undefined}
            aria-hidden={!joinShown || undefined}
            tabIndex={joinShown ? undefined : -1}
          >
            Join for free
          </Link>
        )}
      </div>
    </header>
  );
}
