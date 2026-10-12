"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { paddleApi } from "@/features/billing/paddle-api";
import {
  deleteDriveConnection,
  isDriveAvailable,
} from "@/lib/google-drive/server";
import { listFiles, USER_BUCKETS } from "./user-files";

export type DeleteState = { error?: string };

/** What people type to confirm. */
export const DELETE_PHRASE = "delete my account";

const REMOVE_BATCH = 100;

/**
 * Deletes the signed-in account for good: stops billing first, so nobody is
 * charged for an account that's gone, then removes their files and the
 * account, which takes every database row of theirs with it.
 */
export async function deleteAccount(
  _state: DeleteState,
  formData: FormData,
): Promise<DeleteState> {
  const user = await requireUser();
  const typed = String(formData.get("confirm") ?? "")
    .trim()
    .toLowerCase();
  if (typed !== DELETE_PHRASE)
    return { error: `Type “${DELETE_PHRASE}” to confirm.` };

  const admin = createAdminClient();

  const { data: subscriptions, error: listError } = await admin
    .from("subscriptions")
    .select("id, status")
    .eq("user_id", user.id)
    .neq("status", "canceled");
  if (listError)
    return { error: "We couldn’t check your subscription. Please try again." };
  try {
    for (const subscription of subscriptions ?? [])
      await paddleApi().subscriptions.cancel(subscription.id, {
        effectiveFrom: "immediately",
      });
  } catch (error) {
    console.error("Couldn’t cancel the subscription before deletion:", error);
    return {
      error:
        "We couldn’t cancel your subscription, so nothing was deleted. Cancel it in Settings › Subscription, then try again.",
    };
  }

  if (isDriveAvailable())
    await deleteDriveConnection(user.id, { revoke: true }).catch(
      (error: unknown) =>
        console.error("Couldn’t revoke Drive before deletion:", error),
    );

  try {
    for (const bucket of USER_BUCKETS) {
      const paths = await listFiles(admin, bucket, user.id);
      for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
        const { error } = await admin.storage
          .from(bucket)
          .remove(paths.slice(i, i + REMOVE_BATCH));
        if (error) throw new Error(`${bucket}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error("Couldn’t remove files before deletion:", error);
    return {
      error:
        "We couldn’t delete your files, so your account is still here. Please try again, or email us.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("Couldn’t delete the account:", error.message);
    return {
      error:
        "Your files were removed, but we couldn’t delete the account. Please try again, or email us.",
    };
  }

  // The session belongs to a deleted user now; clear its cookies.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect("/account-deletion?deleted=1");
}
