"use client";

import { useEffect } from "react";
import { preloadSnackbarIcons, showSnackbar } from "../ui/snackbar";

const CHECK_EVERY = 15_000;
const CHECK_TIMEOUT = 5_000;

let lost = false;

const showRestored = () =>
  showSnackbar("Connection restored!", { tone: "connection" });

const showOffline = () =>
  showSnackbar("No internet connection.", {
    tone: "connection",
    persistent: true,
    action: { label: "Retry", onClick: () => void retry() },
  });

// Supabase's root answers 404, which the console logs on every check; its
// storage version needs no key and answers 200.
const PING_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/version`
  : null;

async function reachable() {
  if (!navigator.onLine) return false;
  try {
    await fetch(PING_URL ?? window.location.origin, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: AbortSignal.timeout(CHECK_TIMEOUT),
    });
    return true;
  } catch {
    return false;
  }
}

function markLost() {
  if (lost) return;
  lost = true;
  showOffline();
}

function markBack() {
  if (!lost) return;
  lost = false;
  showRestored();
}

async function check() {
  if (await reachable()) markBack();
  else markLost();
}

async function retry() {
  showSnackbar("Reconnecting…", { tone: "connection", persistent: true });
  if (await reachable()) {
    lost = false;
    showRestored();
  } else showOffline();
}

export function ConnectionWatch() {
  useEffect(() => {
    preloadSnackbarIcons();
    void check();
    const online = () => void check();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void check();
    }, CHECK_EVERY);
    window.addEventListener("offline", markLost);
    window.addEventListener("online", online);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("offline", markLost);
      window.removeEventListener("online", online);
    };
  }, []);
  return null;
}
