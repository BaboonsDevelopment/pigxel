import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function isGoogleSignInAvailable() {
  return isSupabaseConfigured() && Boolean(process.env.GOOGLE_CLIENT_ID);
}
