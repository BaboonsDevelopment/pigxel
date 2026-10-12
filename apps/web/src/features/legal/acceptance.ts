import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { LEGAL, LEGAL_VERSION } from "./legal";

export type AcceptanceSource = "signup" | "oauth" | "gate";

/**
 * Records that the signed-in person accepted the current Terms and Privacy
 * Policy and confirmed the minimum age, then stamps their session so the
 * proxy stops asking. Returns an error message, or null.
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
  // The proxy reads the stamp from the access token, so get a fresh one.
  await supabase.auth.refreshSession();
  return null;
}

/** Both boxes on a sign-up or acceptance form were ticked. */
export function acceptedIn(formData: FormData) {
  return formData.get("age") === "on" && formData.get("terms") === "on";
}
