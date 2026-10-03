import { NextResponse, type NextRequest } from "next/server";
import { authUrl, oauthCallbackUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import {
  DRIVE_SCOPE,
  isDriveAvailable,
  isGoogleSignInAvailable,
} from "@/lib/google-drive/server";
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
    const drive = isDriveAvailable();
    failure = user
      ? withParam(next, drive ? "drive" : "link", "error")
      : failure;
    const hasGoogle = user?.identities?.some((i) => i.provider === "google");
    if (hasGoogle && !drive) return redirect(next);

    // Basic Google login works without Drive secrets or an admin key.
    const options = {
      redirectTo: oauthCallbackUrl("google", next),
      ...(drive && {
        scopes: DRIVE_SCOPE,
        queryParams: {
          access_type: "offline",
          include_granted_scopes: "true",
          ...(user && { prompt: "consent" }),
        },
      }),
    };
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
