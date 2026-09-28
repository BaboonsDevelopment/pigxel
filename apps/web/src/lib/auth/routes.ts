/** Where signed-in people land after logging in or returning to the site. */
export const HOME_PATH = "/tiles";

const protectedPaths = ["/tiles", "/account", "/auth/update-password"];

export function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

const returnPaths = [
  "/tiles",
  "/tiles/new",
  "/tiles/edit",
  "/account",
  "/auth/update-password",
];

/** Where to go after sign-in or linking; unknown targets fall back to HOME_PATH. */
export function safeNext(next: string | null | undefined) {
  return next && returnPaths.includes(next) ? next : HOME_PATH;
}
