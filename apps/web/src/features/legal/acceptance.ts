import "server-only";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { hasAcceptedLegal, LEGAL, LEGAL_VERSION } from "./legal";

/**
 * How someone agreed: email sign-up, Google or Apple, or email login. Each
 * page says that continuing means agreeing to the Terms and Privacy Policy.
 */
export type AcceptanceSource = "signup" | "oauth" | "login";

/**
 * Records that the signed-in person accepted the current Terms and Privacy
 * Policy (the Terms set the minimum age), then stamps their account so it
 * isn't recorded again for this version. Returns an error message, or null.
 */
export async function recordAcceptance(
  supabase: SupabaseClient,
  source: AcceptanceSource,
): Promise<string | null> {
  const { error } = await supabase.from("legal_acceptances").insert({
    terms_version: LEGAL_VERSION,
    privacy_version: LEGAL_VERSION,
    min_age: LEGAL.minAge,
    source,
  });
  if (error) return error.message;
  const { error: metadataError } = await supabase.auth.updateUser({
    data: { legal_version: LEGAL_VERSION },
  });
  if (metadataError) return metadataError.message;
  return null;
}

/**
 * Records the acceptance for someone who just signed in, unless they already
 * accepted the current version. Failures are logged, never shown: the sign-in
 * itself worked.
 */
export async function recordAcceptanceOnce(
  supabase: SupabaseClient,
  user: User | null,
  source: AcceptanceSource,
) {
  if (hasAcceptedLegal(user?.user_metadata)) return;
  const error = await recordAcceptance(supabase, source).catch((e: unknown) =>
    e instanceof Error ? e.message : String(e),
  );
  if (error) console.error("Couldn’t record the terms acceptance:", error);
}
