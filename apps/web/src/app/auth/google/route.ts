import { NextResponse, type NextRequest } from "next/server";
import { authUrl, oauthCallbackUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import { isGoogleSignInAvailable } from "@/lib/auth/google";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const redirect = (path: string) =>
    NextResponse.redirect(authUrl(path), {
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!isGoogleSignInAvailable()) return redirect("/login?error=google");

  let failure = "/login?error=google";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    failure = user ? withParam(next, "link", "error") : failure;
    const hasGoogle = user?.identities?.some((i) => i.provider === "google");
    if (hasGoogle) return redirect(next);

    const options = { redirectTo: oauthCallbackUrl("google", next) };
    const { data, error } =
      user && !hasGoogle
        ? await supabase.auth.linkIdentity({ provider: "google", options })
        : await supabase.auth.signInWithOAuth({ provider: "google", options });
    if (!error && data?.url)
      return NextResponse.redirect(data.url, {
        headers: { "Cache-Control": "private, no-store" },
      });
  } catch {
    // Keep OAuth setup and network failures in the sign-in/linking flow.
  }
  return redirect(failure);
}
