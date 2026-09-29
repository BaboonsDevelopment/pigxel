"use server";

import { redirect } from "next/navigation";
import { refresh, revalidatePath } from "next/cache";
import { authUrl } from "@/lib/auth/config";
import { requireUser } from "@/lib/auth/session";
import type { AuthState } from "@/lib/auth/types";
import {
  deleteDriveConnection,
  isDriveAvailable,
} from "@/lib/google-drive/server";
import { createClient } from "@/lib/supabase/server";

const ACCOUNT_PATH = "/settings/account";

/** Stops Pigxel using this person's Google Drive and revokes its access at Google. */
export async function disconnectDrive() {
  const user = await requireUser();
  if (isDriveAvailable())
    await deleteDriveConnection(user.id, { revoke: true });
  revalidatePath("/", "layout");
  redirect(`${ACCOUNT_PATH}?drive=disconnected`);
}

/**
 * Starts an email change. Supabase emails a link to both the old and the new
 * address; the email changes once both are opened.
 */
export async function changeEmail(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await requireUser();
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    return { error: "Enter a valid email address.", email };
  if (email.toLowerCase() === user.email?.toLowerCase())
    return { error: "This is already your email address.", email };
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: authUrl(`/auth/callback?next=${ACCOUNT_PATH}`) },
    );
    if (error?.code === "email_exists")
      return { error: "Another account already uses this email.", email };
    if (error?.status === 429 || error?.code === "over_email_send_rate_limit")
      return {
        error: "Too many email requests. Please wait a minute and try again.",
        email,
      };
    if (error)
      return { error: "Couldn’t change your email. Try again later.", email };
  } catch {
    return { error: "We couldn’t connect. Please try again.", email };
  }
  return {
    email,
    message: `Almost done: open the links we sent to ${user.email ?? "your current address"} and ${email} to confirm the change.`,
  };
}

/** Removes Google or Apple sign-in; the last way to sign in can't be removed. */
export async function unlinkProvider(
  provider: "google" | "apple",
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (provider !== "google" && provider !== "apple")
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error || !data) return { error: "Couldn’t load your sign-in methods." };
    const identity = data.identities.find((i) => i.provider === provider);
    if (!identity) return {};
    if (data.identities.length < 2)
      return {
        error:
          "This is your only way to sign in. Connect another one first, then try again.",
      };
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(identity);
    if (unlinkError) return { error: "Couldn’t disconnect. Try again." };
    // Drive access came with the Google account.
    if (provider === "google" && isDriveAvailable())
      await deleteDriveConnection(user.id, { revoke: true });
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}
