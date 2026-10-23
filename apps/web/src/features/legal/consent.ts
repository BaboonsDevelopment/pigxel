"use client";

import { useSyncExternalStore } from "react";

/**
 * Optional cookies people choose, kept in this browser only. Today the one
 * optional category is embedded media (YouTube tutorial videos); everything
 * else Pigxel stores is strictly necessary.
 */
type CookieChoice = { media: boolean; at: string };

const KEY = "pigxel:consent:v1";
const CHANGE = "pigxel:consent-change";
const OPEN = "pigxel:consent-open";

let cached: { raw: string | null; value: CookieChoice | null } | undefined;

function read(): CookieChoice | null {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
  if (cached?.raw === raw) return cached.value;
  let value: CookieChoice | null = null;
  try {
    const parsed = raw ? (JSON.parse(raw) as Partial<CookieChoice>) : null;
    if (parsed && typeof parsed.media === "boolean")
      value = { media: parsed.media, at: String(parsed.at ?? "") };
  } catch {
    value = null;
  }
  cached = { raw, value };
  return value;
}

export function saveCookieChoice(choice: { media: boolean }) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...choice, at: new Date().toISOString() }),
    );
  } catch {
    // Storage blocked: the choice lasts until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGE));
}

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The saved choice, `null` when none was made, `undefined` before hydration. */
export function useCookieChoice(): CookieChoice | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}

/** Opens the cookie banner again, e.g. from a "Cookie settings" link. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN));
}

export function onOpenCookieSettings(listener: () => void) {
  window.addEventListener(OPEN, listener);
  return () => window.removeEventListener(OPEN, listener);
}
