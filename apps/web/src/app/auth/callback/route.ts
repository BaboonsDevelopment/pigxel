import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { recordAcceptanceOnce } from "@/features/legal/acceptance";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl, OAUTH_PROVIDER_PARAM } from "@/lib/auth/config";
import { safeNext, withParam } from "@/lib/auth/routes";

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
        if (viaOAuth)
          await recordAcceptanceOnce(supabase, data.session.user, "oauth");
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
      if (user) return redirect(withParam(next, "link", "error"));
    } catch {
      // A provider error should still be usable if Supabase is unreachable.
    }
    return redirect(`/login?error=${viaApple ? "apple" : "google"}`);
  }
  return redirect(`/login?error=${viaOAuth ? provider : "confirmation"}`);
}
