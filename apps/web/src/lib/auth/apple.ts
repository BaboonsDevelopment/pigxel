import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function isAppleSignInAvailable() {
  return isSupabaseConfigured() && Boolean(process.env.APPLE_CLIENT_ID);
}

export const APPLE_FLOW_PARAM = "provider";
