import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * The verified user, or null for a signed-out visitor. Cached per request,
 * so a layout and its page share one check.
 */
export const getUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return error ? null : user;
});

/** Returns the verified user, or sends signed-out visitors to the login page. */
export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
});

export type Profile = {
  name: string;
  email: string | null;
  /** Their @username; null before their profile exists. */
  username: string | null;
  /** A profile picture, e.g. from Google; null shows the initial instead. */
  avatarUrl: string | null;
  /** Their plan's name, e.g. "Pro"; Free when absent. */
  plan?: string;
};

/** What the app shows for a person: their Google name and picture, or their email. */
export function profileOf(user: User): Profile {
  const meta = user.user_metadata ?? {};
  const text = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;
  const avatar = text(meta.avatar_url) ?? text(meta.picture);
  return {
    name:
      text(meta.full_name) ??
      text(meta.name) ??
      user.email?.split("@")[0] ??
      "Pigxel artist",
    email: user.email ?? null,
    username: null,
    avatarUrl: avatar?.startsWith("https://") ? avatar : null,
  };
}
