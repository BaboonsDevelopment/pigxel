"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@pigxel/ui/lib/utils";

type Visit = { url: string; previous: string | null; canGoBack: boolean };
let visit: Visit | null = null;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => visit;
const serverSnapshot = () => null;
function publish(next: Visit | null) {
  visit = next;
  for (const listener of listeners) listener();
}
function localHref(value: string): string | null {
  return value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\u0000-\u0020]/.test(value)
    ? value
    : null;
}
const pathOf = (url: string) => url.split(/[?#]/, 1)[0];
const locationHref = () =>
  window.location.pathname + window.location.search + window.location.hash;

/** Track only navigation observed in this tab; a direct link gets a safe fallback. */
export function NavigationHistory() {
  const pathname = usePathname();
  const source = useRef<{ url: string; length: number } | null>(null);
  useEffect(() => {
    const capture = () => {
      source.current = { url: locationHref(), length: window.history.length };
    };
    const popped = () => {
      capture();
      // After browser back/forward, the next older entry might be off-site.
      publish({ url: locationHref(), previous: null, canGoBack: false });
    };
    capture();
    publish({ url: locationHref(), previous: null, canGoBack: false });
    document.addEventListener("click", capture, true);
    document.addEventListener("keydown", capture, true);
    window.addEventListener("popstate", popped);
    return () => {
      document.removeEventListener("click", capture, true);
      document.removeEventListener("keydown", capture, true);
      window.removeEventListener("popstate", popped);
      publish(null);
    };
  }, []);
  useEffect(() => {
    const url = locationHref();
    const previous = source.current;
    if (previous && pathOf(previous.url) !== pathname) {
      publish({
        url,
        previous: previous.url,
        canGoBack: window.history.length > previous.length,
      });
    }
    source.current = { url, length: window.history.length };
  }, [pathname]);
  return null;
}

/** A visible back control, or an in-place back action for modal details. */
export function BackButton({
  href = "/home",
  onBack,
  preferHistory = true,
  children = "Back",
  className,
}: {
  href?: string;
  onBack?: () => void;
  preferHistory?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const navigation = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const previous =
    preferHistory && navigation && pathOf(navigation.url) === pathname
      ? localHref(navigation.previous ?? "")
      : null;
  const destination = previous ?? localHref(href) ?? "/home";
  const content = (
    <>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-4 shrink-0"
      >
        <path d="M16 10H4m5-5-5 5 5 5" />
      </svg>
      {children}
    </>
  );
  const style = cn(
    "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#e7c6d2] bg-white px-3.5 text-sm font-medium text-[#704258] transition-colors hover:border-primary hover:bg-[#fff2f7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    className,
  );
  if (onBack)
    return (
      <button type="button" onClick={onBack} className={style}>
        {content}
      </button>
    );
  return (
    <Link
      href={destination}
      className={style}
      onClick={(event) => {
        if (
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        if (previous && navigation?.canGoBack) router.back();
        else router.replace(destination);
      }}
    >
      {content}
    </Link>
  );
}
