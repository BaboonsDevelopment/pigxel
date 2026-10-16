import { NextResponse, type NextRequest } from "next/server";
import { isAppleSignInAvailable } from "@/lib/auth/apple";
import { authUrl, oauthCallbackUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const redirect = (path: string) =>
    NextResponse.redirect(authUrl(path), {
      headers: { "Cache-Control": "private, no-store" },
    });
  if (!isAppleSignInAvailable()) return redirect("/login?error=apple");

  let failure = "/login?error=apple";
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    failure = user ? withParam(next, "link", "error") : failure;
    if (user?.identities?.some((identity) => identity.provider === "apple"))
      return redirect(next);
    const options = { redirectTo: oauthCallbackUrl("apple", next) };
    const { data, error } = user
      ? await supabase.auth.linkIdentity({ provider: "apple", options })
      : await supabase.auth.signInWithOAuth({ provider: "apple", options });
    if (!error && data?.url)
      return NextResponse.redirect(data.url, {
        headers: { "Cache-Control": "private, no-store" },
      });
  } catch {
    // Network/configuration errors return to the same sign-in or linking UI.
  }
  return redirect(failure);
}
