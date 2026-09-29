"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/auth/types";

export async function updatePassword(
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = formData.get("password");
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  )
    return { error: "Use a password between 8 and 128 characters." };
  if (password !== formData.get("confirmPassword"))
    return { error: "Passwords do not match." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return {
        error:
          "Your session has expired. Request a new reset link or log in again.",
      };
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
      return {
        error:
          error.code === "same_password"
            ? "Choose a password different from your current password."
            : "Unable to update your password. Try a stronger password or request a new reset link.",
      };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/settings/account?updated=password");
}
