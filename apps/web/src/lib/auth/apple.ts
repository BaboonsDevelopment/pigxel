import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Apple sign-in needs an Apple Developer account: a Services ID and a key,
 * set in Supabase (Authentication → Sign In / Providers → Apple). Until
 * APPLE_CLIENT_ID is set here too, Apple buttons stay hidden.
 */
export function isAppleSignInAvailable() {
  return isSupabaseConfigured() && Boolean(process.env.APPLE_CLIENT_ID);
}

/** Marks the callback of an Apple flow, so it isn't taken for Google Drive. */
export const APPLE_FLOW_PARAM = "provider";
