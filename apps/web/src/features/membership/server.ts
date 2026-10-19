import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Badge = {
  id: string;
  label: string;
  message: string;
  visible: boolean;
  sender: { username: string } | null;
  art: { thumbnail: string | null } | null;
};
export type HiringProfile = {
  headline: string;
  description: string;
  contact_url: string;
  available: boolean;
};
export type PortfolioItem = {
  id: string;
  title: string;
  description: string;
  url: string;
  art: { thumbnail: string | null } | null;
};
export type BadgeArt = { id: string; name: string };

export async function listBadgeArt(userId: string): Promise<BadgeArt[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tiles")
    .select("id, name")
    .eq("user_id", userId)
    .eq("visibility", "public")
    .eq("review", "approved")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(100)
    .returns<BadgeArt[]>();
  if (error) throw new Error("Couldn’t load published artwork.");
  return data;
}

export async function listProfileBadges(
  userId: string,
  own = false,
): Promise<Badge[]> {
  const supabase = await createClient();
  let request = supabase
    .from("profile_badges")
    .select(
      "id, label, message, visible, sender:profiles!sender_id(username), art:tiles!tile_id(thumbnail)",
    )
    .eq("recipient_id", userId);
  if (!own) request = request.eq("visible", true);
  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Badge[]>();
  if (error) throw new Error("Couldn’t load profile badges.");
  return data;
}

export async function getHiringProfile(userId: string) {
  const supabase = await createClient();
  const [profile, portfolio] = await Promise.all([
    supabase
      .from("hiring_profiles")
      .select("headline, description, contact_url, available")
      .eq("user_id", userId)
      .maybeSingle<HiringProfile>(),
    supabase
      .from("hiring_portfolio_items")
      .select("id, title, description, url, art:tiles!tile_id(thumbnail)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12)
      .returns<PortfolioItem[]>(),
  ]);
  if (profile.error || portfolio.error)
    throw new Error("Couldn’t load the hiring portfolio.");
  return { profile: profile.data, portfolio: portfolio.data };
}
