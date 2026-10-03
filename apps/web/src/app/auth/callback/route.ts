import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl, OAUTH_PROVIDER_PARAM } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";
import {
  isDriveAvailable,
  saveDriveConnection,
} from "@/lib/google-drive/server";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const code = params.get("code");
  const provider = params.get(OAUTH_PROVIDER_PARAM);
  const viaApple = provider === "apple";
  const viaOAuth = viaApple || provider === "google";
  const next = safeNext(params.get("next"));
  const redirect = (path: string) =>
    NextResponse.redirect(authUrl(path), {
      headers: { "Cache-Control": "private, no-store" },
    });

  if (code && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const flowId = params.get("sb_flow_id");
      const { data, error } = await supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      );
      if (!error && data.session) {
        const refreshToken = data.session.provider_refresh_token;
        if (refreshToken && !viaApple && isDriveAvailable()) {
          const google = data.session.user.identities?.find(
            (identity) => identity.provider === "google",
          );
          // An Apple account may also have a Google identity; never save its
          // Apple refresh token as a Drive connection.
          if (google && (provider === "google" || !provider)) {
            try {
              await saveDriveConnection(data.session.user.id, {
                refreshToken,
                email:
                  (google.identity_data?.email as string | undefined) ?? null,
              });
            } catch {
              return redirect(withParam(next, "drive", "error"));
            }
          }
        }
        return redirect(next);
      }
    } catch {
      // Treat failed exchanges and cancelled OAuth consistently below.
    }
  }

  if ((viaOAuth || params.has("error")) && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user)
        return redirect(
          withParam(
            next,
            !viaApple && isDriveAvailable() ? "drive" : "link",
            "error",
          ),
        );
    } catch {
      // A provider error should still be usable if Supabase is unreachable.
    }
    return redirect(`/login?error=${viaApple ? "apple" : "google"}`);
  }
  return redirect(`/login?error=${viaOAuth ? provider : "confirmation"}`);
}
