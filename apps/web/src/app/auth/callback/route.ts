import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl } from "@/lib/auth/config";
import { HOME_PATH } from "@/lib/auth/routes";

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
        const next =
          request.nextUrl.searchParams.get("next") === "/auth/update-password"
            ? "/auth/update-password"
            : HOME_PATH;
        return NextResponse.redirect(authUrl(next), {
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    } catch {
      /* Verification failures return to login without exposing tokens. */
    }
  }
  return NextResponse.redirect(authUrl("/login?error=confirmation"));
}
