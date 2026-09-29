import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import {
  isDriveAvailable,
  saveDriveConnection,
} from "@/lib/google-drive/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const flowId = request.nextUrl.searchParams.get("sb_flow_id");
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (!error && data.session) {
        const next = safeNext(request.nextUrl.searchParams.get("next"));
        const refreshToken = data.session.provider_refresh_token;
        // Google sign-in or linking: keep Drive access for this person.
        if (refreshToken && isDriveAvailable()) {
          const google = data.session.user.identities?.find(
            (identity) => identity.provider === "google",
          );
          try {
            await saveDriveConnection(data.session.user.id, {
              refreshToken,
              email:
                (google?.identity_data?.email as string | undefined) ?? null,
            });
          } catch {
            return NextResponse.redirect(
              authUrl(withParam(next, "drive", "error")),
            );
          }
        }
        return NextResponse.redirect(authUrl(next), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    } catch {
      /* Verification failures return to login without exposing tokens. */
    }
  }
  // Google sign-in or linking that was cancelled or refused at Google.
  if (request.nextUrl.searchParams.has("error") && isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    if (user)
      return NextResponse.redirect(authUrl(withParam(next, "drive", "error")));
    if (!code) return NextResponse.redirect(authUrl("/login?error=google"));
  }
  return NextResponse.redirect(authUrl("/login?error=confirmation"));
}
