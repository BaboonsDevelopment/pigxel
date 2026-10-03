import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getOwnProfile } from "@/lib/profile/server";

export const dynamic = "force-dynamic";

export default async function OwnProfile() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  redirect(profile ? `/u/${profile.username}` : "/settings/profile");
}
