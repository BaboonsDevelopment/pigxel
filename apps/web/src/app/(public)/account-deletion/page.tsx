import type { Metadata } from "next";
import Link from "next/link";
import { Notice } from "@pigxel/ui/components/notice";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";

export const metadata: Metadata = {
  title: "Delete your account · Pigxel",
  description:
    "How to download your data and delete your Pigxel account, and what is deleted.",
};

export default async function AccountDeletion({
  searchParams,
}: {
  searchParams: Promise<{ deleted?: string }>;
}) {
  const { deleted } = await searchParams;
  return (
    <LegalPage
      title="Delete your account"
      intro={
        <>
          {deleted && (
            <Notice tone="success" className="mb-6">
              Your Pigxel account and its data have been deleted. Thanks for
              drawing with us.
            </Notice>
          )}
          <p>
            You can delete your Pigxel account and its data at any time, and
            download a copy first.
          </p>
        </>
      }
    >
      <LegalSection title="1. In the app">
        <ol className="mt-3 list-decimal space-y-1.5 pl-5">
          <li>
            Log in and open{" "}
            <Link href="/settings/account#your-data">Settings › Account</Link>.
          </li>
          <li>Under “Your data”, download a ZIP of everything we store.</li>
          <li>
            Under “Delete account”, type the confirmation and delete. It happens
            right away.
          </li>
        </ol>
      </LegalSection>

      <LegalSection title="2. If you can’t log in">
        <p>
          Email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from the
          address on your account and ask us to delete it. We may ask you to
          confirm it’s yours, and we’ll do it within one month.
        </p>
      </LegalSection>

      <LegalSection title="3. What’s deleted">
        <p>
          Your account and sign-in details, profile, saved tiles and their
          versions, published art, comments, likes, follows, collections,
          labels, AI chats and usage records, feedback, and the files you
          uploaded. A paid plan is cancelled immediately. Projects you shared
          are removed for the people you shared them with.
        </p>
        <p>
          We keep only what the law requires, such as billing records held by
          Creem and for tax. Backup copies are overwritten on our providers’
          schedule. Files in your Google Drive and drafts in your browser stay
          under your control; delete them there.
        </p>
      </LegalSection>

      <LegalSection title="4. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
