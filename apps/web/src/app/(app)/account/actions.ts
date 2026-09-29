"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import {
  deleteDriveConnection,
  isDriveAvailable,
} from "@/lib/google-drive/server";

/** Stops Pigxel using this person's Google Drive and revokes its access at Google. */
export async function disconnectDrive() {
  const user = await requireUser();
  if (isDriveAvailable())
    await deleteDriveConnection(user.id, { revoke: true });
  revalidatePath("/", "layout");
  redirect("/account?drive=disconnected");
}
