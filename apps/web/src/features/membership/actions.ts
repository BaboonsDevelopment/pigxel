"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getCurrentPlan } from "@/features/billing/server";
import {
  readBadge,
  readHiring,
  readPortfolio,
  UUID,
  type PerkState,
} from "./validation";

async function paidUser() {
  const user = await requireUser();
  return (await getCurrentPlan(user.id)).name !== "Free" ? user : null;
}
function refreshPerks() {
  revalidatePath("/settings/perks");
  revalidatePath("/u/[username]", "page");
}

export async function giftBadge(
  _state: PerkState,
  form: FormData,
): Promise<PerkState> {
  if (!(await paidUser()))
    return { error: "A paid plan is needed to gift badges." };
  const result = readBadge(form);
  if ("error" in result) return { error: result.error };
  const supabase = await createClient();
  const { error } = await supabase.rpc("gift_profile_badge", {
    p_username: result.value.username,
    p_tile_id: result.value.tileId,
    p_label: result.value.label,
    p_message: result.value.message,
  });
  if (error)
    return {
      error:
        "Couldn’t send the badge. Choose another artist and one of your published artworks. You can send up to five gifts per day.",
    };
  refreshPerks();
  return {
    message:
      "Badge sent! The recipient can choose to display it on their profile.",
  };
}

export async function setBadgeVisible(
  id: string,
  visible: boolean,
): Promise<PerkState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { error: "Unknown badge." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profile_badges")
    .update({ visible })
    .eq("id", id)
    .eq("recipient_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data) return { error: "Couldn’t update the badge." };
  refreshPerks();
  return {};
}

export async function removeBadge(id: string): Promise<PerkState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { error: "Unknown badge." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("profile_badges")
    .delete()
    .eq("id", id)
    .eq("recipient_id", user.id);
  if (error) return { error: "Couldn’t remove the badge." };
  refreshPerks();
  return {};
}

export async function saveHiringProfile(
  _state: PerkState,
  form: FormData,
): Promise<PerkState> {
  const user = await paidUser();
  if (!user) return { error: "A paid plan is needed for a hiring portfolio." };
  const result = readHiring(form);
  if ("error" in result) return { error: result.error };
  const supabase = await createClient();
  const existing = await supabase
    .from("hiring_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error)
    return { error: "Couldn’t load your hiring profile. Try again." };
  const { error } = existing.data
    ? await supabase
        .from("hiring_profiles")
        .update(result.value)
        .eq("user_id", user.id)
    : await supabase.from("hiring_profiles").insert(result.value);
  if (error) return { error: "Couldn’t save your hiring profile. Try again." };
  refreshPerks();
  return {
    message:
      "Hiring profile saved. It appears on your public profile while your paid plan is active.",
  };
}

export async function addPortfolioItem(
  _state: PerkState,
  form: FormData,
): Promise<PerkState> {
  if (!(await paidUser()))
    return { error: "A paid plan is needed to add portfolio work." };
  const result = readPortfolio(form);
  if ("error" in result) return { error: result.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("hiring_portfolio_items")
    .insert(result.value);
  if (error)
    return {
      error:
        "Couldn’t add this item. Your portfolio can contain up to twelve items; any preview must be your published artwork.",
    };
  refreshPerks();
  return { message: "Portfolio item added." };
}

export async function removePortfolioItem(id: string): Promise<PerkState> {
  const user = await requireUser();
  if (!UUID.test(id)) return { error: "Unknown portfolio item." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("hiring_portfolio_items")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "Couldn’t remove this item." };
  refreshPerks();
  return {};
}

export async function editPortfolioItem(
  id: string,
  _state: PerkState,
  form: FormData,
): Promise<PerkState> {
  const user = await paidUser();
  if (!user) return { error: "A paid plan is needed to edit portfolio work." };
  if (!UUID.test(id)) return { error: "Unknown portfolio item." };
  const result = readPortfolio(form);
  if ("error" in result) return { error: result.error };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("hiring_portfolio_items")
    .update(result.value)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return {
      error:
        "Couldn’t save this item. Check the artwork preview and try again.",
    };
  refreshPerks();
  return { message: "Portfolio item saved." };
}

export async function reorderPortfolioItems(ids: string[]): Promise<PerkState> {
  if (!(await paidUser()))
    return { error: "A paid plan is needed to reorder portfolio work." };
  if (
    !Array.isArray(ids) ||
    !ids.length ||
    ids.length > 12 ||
    ids.some((id) => typeof id !== "string" || !UUID.test(id)) ||
    new Set(ids).size !== ids.length
  )
    return { error: "Invalid portfolio order." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_portfolio_items", {
    p_ids: ids,
  });
  if (error)
    return {
      error: "Couldn’t reorder your portfolio. Refresh the page and try again.",
    };
  refreshPerks();
  return { message: "Portfolio order saved." };
}
