import { NextResponse, type NextRequest } from "next/server";
import { APPLE_FLOW_PARAM, isAppleSignInAvailable } from "@/lib/auth/apple";
import { authUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

/**
 * Sends the person to Apple, then back to `next` through /auth/callback:
 * signed out it signs them in, signed in it links Apple to their account.
 */
export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!isAppleSignInAvailable())
    return NextResponse.redirect(authUrl("/login?error=apple"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const options = {
    redirectTo: authUrl(
      `/auth/callback?next=${encodeURIComponent(next)}&${APPLE_FLOW_PARAM}=apple`,
    ),
  };
  const { data } = user
    ? await supabase.auth.linkIdentity({ provider: "apple", options })
    : await supabase.auth.signInWithOAuth({ provider: "apple", options });

  return NextResponse.redirect(
    data?.url ??
      authUrl(user ? withParam(next, "link", "error") : "/login?error=apple"),
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
