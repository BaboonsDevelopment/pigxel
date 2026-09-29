import { NextResponse, type NextRequest } from "next/server";
import { authUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import {
  DRIVE_SCOPE,
  isDriveAvailable,
  isGoogleSignInAvailable,
} from "@/lib/google-drive/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends the person to Google, then back to `next` through /auth/callback:
 * - signed out: "Sign in with Google", which also connects Drive;
 * - signed in with email: links a Google account to connect Drive;
 * - signed in with Google: asks again for Drive access (e.g. after disconnecting).
 */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!isGoogleSignInAvailable())
    return NextResponse.redirect(authUrl("/login?error=google"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const redirectTo = authUrl(`/auth/callback?next=${encodeURIComponent(next)}`);
  // "offline" returns a refresh token, so Drive keeps working after the hour-long access token.
  const options = {
    redirectTo,
    scopes: DRIVE_SCOPE,
    queryParams: { access_type: "offline", include_granted_scopes: "true" },
  };

  let url: string | undefined;
  if (!user) {
    const { data } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options,
    });
    url = data.url ?? undefined;
  } else if (!isDriveAvailable()) {
    return NextResponse.redirect(authUrl(next));
  } else {
    // "consent" makes Google send a new refresh token even if access was granted before.
    const connect = {
      ...options,
      queryParams: { ...options.queryParams, prompt: "consent" },
    };
    const hasGoogle = user.identities?.some((i) => i.provider === "google");
    const { data } = hasGoogle
      ? await supabase.auth.signInWithOAuth({
          provider: "google",
          options: connect,
        })
      : await supabase.auth.linkIdentity({
          provider: "google",
          options: connect,
        });
    url = data?.url ?? undefined;
  }

  return NextResponse.redirect(
    url ??
      authUrl(user ? withParam(next, "drive", "error") : "/login?error=google"),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
