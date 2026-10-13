"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PrivacyState = { error?: string; message?: string };

export async function setProfileVisibility(
  _state: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  const user = await requireUser();
  const visibility = formData.get("visibility");
  if (visibility !== "public" && visibility !== "private")
    return { error: "Choose who can see your profile." };
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ visibility })
      .eq("id", user.id);
    if (error) return { error: "Couldn’t save. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {
    message:
      visibility === "private"
        ? "Your profile is now private."
        : "Your profile is now public.",
  };
}

export async function setShowActivity(
  _state: PrivacyState,
  formData: FormData,
): Promise<PrivacyState> {
  const user = await requireUser();
  const show = formData.get("showActivity") === "on";
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ show_activity: show })
      .eq("id", user.id);
    if (error) return { error: "Couldn’t save. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {
    message: show
      ? "Your activity heatmap is visible on your profile."
      : "Your activity heatmap is hidden from others.",
  };
}
