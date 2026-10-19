"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin, requireUser } from "@/lib/auth/session";
import {
  FEEDBACK_KINDS,
  FEEDBACK_STATUSES,
  OPEN_LIMIT,
  pageFrom,
  readFeedback,
  type FeedbackInput,
} from "./feedback";
import { countOwnOpen } from "./server";
import { PATCH_NOTES } from "@/features/patch-notes/patch-notes";
import { createClient } from "@/lib/supabase/server";

export async function updateFeedbackStatus(
  id: number,
  status: string,
): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!isAdmin(user))
    return { error: "Only the Pigxel team can change feedback status." };
  if (
    !Number.isSafeInteger(id) ||
    id < 1 ||
    !Object.hasOwn(FEEDBACK_STATUSES, status)
  )
    return { error: "Choose a valid feedback item and status." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_feedback_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { error: "Couldn’t update the status. Try again." };
  refresh();
  return {};
}

export type FeedbackFormState = {
  error?: string;
  field?: "kind" | "title" | "description";
  values?: Partial<FeedbackInput>;
};

const text = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

const limitReached = (kind: FeedbackInput["kind"]) =>
  `You have ${OPEN_LIMIT} open ${FEEDBACK_KINDS[kind].one}s already. You can send another once the team has looked at one of them.`;

export async function createFeedback(
  _state: FeedbackFormState,
  formData: FormData,
): Promise<FeedbackFormState> {
  const user = await requireUser();
  const raw = {
    kind: text(formData, "kind"),
    title: text(formData, "title"),
    description: text(formData, "description"),
  };
  const values = raw as Partial<FeedbackInput>;
  const checked = readFeedback(raw);
  if ("error" in checked) return { ...checked, values };
  const { kind } = checked.value;

  try {
    if ((await countOwnOpen(user.id))[kind] >= OPEN_LIMIT)
      return { values, error: limitReached(kind) };
    const supabase = await createClient();
    const { error } = await supabase.from("feedback").insert({
      ...checked.value,
      page: pageFrom(text(formData, "page")),
      user_agent: (await headers()).get("user-agent")?.slice(0, 500) ?? null,
      app_version: PATCH_NOTES[0]?.version ?? null,
    });
    if (error?.message.includes("feedback_open_limit"))
      return { values, error: limitReached(kind) };
    if (error) return { values, error: "Couldn’t send it. Try again." };
  } catch {
    return { values, error: "We couldn’t connect. Please try again." };
  }
  redirect(`/feedback?kind=${kind}&sort=newest`);
}

export async function setVote(id: number, vote: boolean): Promise<boolean> {
  const user = await requireUser();
  if (!Number.isSafeInteger(id) || id < 1) return false;
  try {
    const supabase = await createClient();
    const { error } = vote
      ? await supabase.from("feedback_votes").insert({ feedback_id: id })
      : await supabase
          .from("feedback_votes")
          .delete()
          .eq("feedback_id", id)
          .eq("user_id", user.id);
    if (error && error.code !== "23505") return false;
  } catch {
    return false;
  }
  refresh();
  return true;
}
