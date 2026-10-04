import type { AuthMode } from "./types";

export const HOME_PATH = "/home";

const protectedPaths = [
  "/home",
  "/tiles",
  "/settings",
  "/profile",
  "/patch-notes",
  "/assets",
  "/tutorials",
  "/feedback",
  "/auth/update-password",
];

export function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

const returnPaths = [
  "/home",
  "/tiles",
  "/tiles/new",
  "/tiles/edit",
  "/settings/account",
  "/settings/profile",
  "/pricing",
  "/auth/update-password",
];

const BASE = "http://pigxel.invalid";

export function safeNext(next: string | null | undefined) {
  if (!next) return HOME_PATH;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return HOME_PATH;
  }
  if (url.origin !== BASE) return HOME_PATH;
  if (/^\/u\/[a-z0-9_]{3,20}$/.test(url.pathname)) return url.pathname;
  if (!returnPaths.includes(url.pathname)) return HOME_PATH;
  const id = url.searchParams.get("id");
  return url.pathname === "/tiles/edit" && id && /^[\w-]{1,64}$/.test(id)
    ? `/tiles/edit?id=${id}`
    : url.pathname;
}

export function loginUrl(mode: AuthMode = "login", next = HOME_PATH) {
  const url = new URL("/login", BASE);
  if (mode !== "login") url.searchParams.set("mode", mode);
  if (next !== HOME_PATH) url.searchParams.set("next", next);
  return url.pathname + url.search;
}

export function withParam(path: string, key: string, value: string) {
  const url = new URL(path, BASE);
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}
