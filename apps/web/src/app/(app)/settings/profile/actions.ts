"use server";

import { refresh } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { AVATAR_BUCKET, type AvatarKind } from "@/lib/profile/profile";
import {
  BIO_MAX,
  NAME_MAX,
  normalizeUsername,
  parseLinks,
  usernameError,
} from "@/lib/profile/validation";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = {
  error?: string;
  /** The field the error is about, so it can be shown next to it. */
  field?: "name" | "username" | "bio" | "links";
  message?: string;
};

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function updateProfile(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const user = await requireUser();
  const name = text(formData, "name").trim();
  if (!name || name.length > NAME_MAX)
    return {
      field: "name",
      error: `Use a display name of 1–${NAME_MAX} characters.`,
    };
  const username = normalizeUsername(text(formData, "username"));
  const badUsername = usernameError(username);
  if (badUsername) return { field: "username", error: badUsername };
  // Line breaks are kept; everything else is plain text.
  const bio = text(formData, "bio").replace(/\r\n/g, "\n").trim();
  if (bio.length > BIO_MAX)
    return {
      field: "bio",
      error: `Keep your description to ${BIO_MAX} characters.`,
    };
  const parsed = parseLinks(
    formData.getAll("linkUrl").map(String),
    formData.getAll("linkLabel").map(String),
  );
  if ("error" in parsed) return { field: "links", error: parsed.error };

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, username, bio, links: parsed.links })
      .eq("id", user.id);
    if (error?.code === "23505")
      return { field: "username", error: "This username is taken." };
    if (error) return { error: "Couldn’t save your profile. Try again." };
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return { message: "Profile saved." };
}

/** Whether the signed-in person can take `raw`, with the reason when not. */
export async function checkUsername(
  raw: string,
): Promise<{ available: boolean; error?: string }> {
  await requireUser();
  const username = normalizeUsername(raw);
  const invalid = usernameError(username);
  if (invalid) return { available: false, error: invalid };
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("username_available", {
      name: username,
    });
    if (error) return { available: false, error: "Couldn’t check right now." };
    return data === true
      ? { available: true }
      : { available: false, error: "This username is taken." };
  } catch {
    return { available: false, error: "Couldn’t check right now." };
  }
}

/**
 * Switches the picture: none, the sign-in provider's, or a file the browser
 * just uploaded to the person's own folder. The previous upload is removed.
 */
export async function setAvatar(
  kind: AvatarKind,
  path?: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!["none", "provider", "upload"].includes(kind))
    return { error: "Invalid request." };
  if (
    kind === "upload" &&
    (!path || !new RegExp(`^${user.id}/[\\w-]+\\.png$`).test(path))
  )
    return { error: "Invalid request." };
  try {
    const supabase = await createClient();
    const { data: before } = await supabase
      .from("profiles")
      .select("avatar_path")
      .eq("id", user.id)
      .maybeSingle<{ avatar_path: string | null }>();
    const { error } = await supabase
      .from("profiles")
      .update(
        kind === "upload"
          ? { avatar_kind: kind, avatar_path: path }
          : { avatar_kind: kind, avatar_path: null },
      )
      .eq("id", user.id);
    if (error) return { error: "Couldn’t change your picture. Try again." };
    const old = before?.avatar_path;
    if (old && old !== path)
      await supabase.storage.from(AVATAR_BUCKET).remove([old]);
  } catch {
    return { error: "We couldn’t connect. Please try again." };
  }
  refresh();
  return {};
}
