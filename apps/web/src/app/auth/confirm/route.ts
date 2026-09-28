import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if (token_hash && type === "recovery" && isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash,
        type,
      });
      if (!error && data.session)
        return NextResponse.redirect(authUrl("/auth/update-password"), {
          headers: { "Cache-Control": "private, no-store" },
        });
    } catch {
      /* Verification failures return to login without exposing tokens. */
    }
  }
  return NextResponse.redirect(authUrl("/login?error=confirmation"));
}
