/** Where signed-in people land after logging in or returning to the site. */
export const HOME_PATH = "/home";

const protectedPaths = [
  "/home",
  "/tiles",
  "/settings",
  "/profile",
  "/u",
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
  "/auth/update-password",
];

const BASE = "http://pigxel.invalid";

/**
 * Where to go after sign-in or linking; unknown targets fall back to
 * HOME_PATH. Only the editor keeps a query: the id of the tile being edited.
 */
export function safeNext(next: string | null | undefined) {
  if (!next) return HOME_PATH;
  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return HOME_PATH;
  }
  if (url.origin !== BASE || !returnPaths.includes(url.pathname))
    return HOME_PATH;
  const id = url.searchParams.get("id");
  return url.pathname === "/tiles/edit" && id && /^[\w-]{1,64}$/.test(id)
    ? `/tiles/edit?id=${id}`
    : url.pathname;
}

/** `path` with one more query parameter. */
export function withParam(path: string, key: string, value: string) {
  const url = new URL(path, BASE);
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}
