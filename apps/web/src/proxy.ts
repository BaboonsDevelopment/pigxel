import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
import {
  ACCEPT_PATH,
  HOME_PATH,
  isProtectedPath,
  isUngatedPath,
  safeNext,
} from "@/lib/auth/routes";
import { hasAcceptedLegal } from "@/features/legal/legal";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { pathname, searchParams } = request.nextUrl;
  if (!isSupabaseConfigured()) {
    return isProtectedPath(pathname) ? redirectTo(request, "/login") : response;
  }
  const { url, key } = supabaseConfig();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  let destination: string | undefined;
  if (!signedIn && isProtectedPath(pathname)) {
    destination =
      pathname === "/auth/update-password"
        ? "/login?mode=forgot&error=expired"
        : "/login";
  } else if (signedIn && pathname === "/login") {
    destination = safeNext(searchParams.get("next"));
  } else if (
    signedIn &&
    pathname === "/" &&
    !searchParams.has("code") &&
    !searchParams.has("error")
  ) {
    destination = HOME_PATH;
  } else if (
    signedIn &&
    (request.method === "GET" || request.method === "HEAD") &&
    !isUngatedPath(pathname) &&
    !(
      pathname === "/" &&
      (searchParams.has("code") || searchParams.has("error"))
    ) &&
    !hasAcceptedLegal(
      data?.claims.user_metadata as { legal_version?: unknown } | undefined,
    )
  ) {
    // Someone who hasn't accepted the current Terms and Privacy Policy (or
    // confirmed their age) does that before using the app.
    const next =
      pathname === "/" ? HOME_PATH : pathname + request.nextUrl.search;
    destination = `${ACCEPT_PATH}?next=${encodeURIComponent(next)}`;
  }

  if (destination) {
    const redirect = redirectTo(request, destination);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    response = redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function redirectTo(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
