/** Where signed-in people land after logging in or returning to the site. */
export const HOME_PATH = "/tiles";

const protectedPaths = ["/tiles", "/account", "/auth/update-password"];

export function isProtectedPath(pathname: string) {
  return protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
