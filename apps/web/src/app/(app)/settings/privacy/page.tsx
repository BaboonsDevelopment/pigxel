import type { Metadata } from "next";
import { Notice } from "@pigxel/ui/components/notice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { requireUser } from "@/lib/auth/session";
import { getOwnProfile } from "@/lib/profile/server";
import { PrivacyForm } from "./privacy-form";

export const metadata: Metadata = { title: "Privacy settings · Pigxel" };
export const dynamic = "force-dynamic";

export default async function PrivacySettings() {
  const user = await requireUser();
  const profile = await getOwnProfile(user.id);
  return (
    <section aria-labelledby="visibility-heading">
      <SectionTitle id="visibility-heading">
        Who can see your profile
      </SectionTitle>
      <Lead className="mt-2">
        Each art is also private until you publish it from your profile.
      </Lead>
      {profile ? (
        <PrivacyForm visibility={profile.visibility} />
      ) : (
        <Notice tone="error" className="mt-4">
          Profiles aren’t set up on this server yet.
        </Notice>
      )}
    </section>
  );
}
