import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@pigxel/ui/components/notice";
import {
  SectionTitle,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";
import { getOwnProfile } from "@/features/profile/server";
import { AvatarField } from "@/features/settings/profile/avatar-field";
import { ProfileForm } from "@/features/settings/profile/profile-form";

export const metadata: Metadata = { title: "Profile settings · Pigxel" };
export const dynamic = "force-dynamic";

export default async function ProfileSettings() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  if (!profile)
    return (
      <Notice tone="error">
        Profiles aren’t set up on this server yet. Apply the latest database
        migrations, then reload this page.
      </Notice>
    );
  return (
    <div className="space-y-10">
      <section aria-labelledby="avatar-heading">
        <SectionTitle id="avatar-heading">Profile picture</SectionTitle>
        <AvatarField userId={user.id} profile={profile} />
      </section>
      <section aria-labelledby="details-heading" className="border-t pt-10">
        <div className="flex items-baseline justify-between gap-4">
          <SectionTitle id="details-heading">About you</SectionTitle>
          <Link
            href={`/u/${profile.username}`}
            className={`text-sm ${textLinkClassName}`}
          >
            View profile
          </Link>
        </div>
        <ProfileForm profile={profile} />
      </section>
    </div>
  );
}
