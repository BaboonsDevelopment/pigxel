import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Notice } from "@pigxel/ui/components/notice";
import { Lead, Text } from "@pigxel/ui/components/typography";
import { isAppleSignInAvailable } from "@/lib/auth/apple";
import { requireUser } from "@/lib/auth/session";
import { isGoogleSignInAvailable } from "@/lib/auth/google";
import {
  EmailForm,
  UnlinkButton,
} from "@/features/settings/account/account-forms";
import { SignOutButton } from "@/features/settings/account/sign-out-button";
import { DeleteAccountForm } from "@/features/settings/account/delete-account-form";
import { SettingsSection } from "@/features/settings/components/settings-section";

export const metadata: Metadata = { title: "Account settings · Pigxel" };
export const dynamic = "force-dynamic";

const ACCOUNT_PATH = "/settings/account";
const secondaryButton = buttonVariants({ variant: "secondary" });

export default async function AccountSettings({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; link?: string }>;
}) {
  const { updated, link } = await searchParams;
  const user = await requireUser();
  const identities = user.identities ?? [];
  const identity = (provider: string) =>
    identities.find((i) => i.provider === provider);
  const identityEmail = (provider: string) => {
    const email = identity(provider)?.identity_data?.email;
    return typeof email === "string" ? email : null;
  };
  const canUnlink = identities.length > 1;
  const hasPassword = Boolean(identity("email"));

  const providers = [
    {
      id: "google" as const,
      label: "Google",
      available: isGoogleSignInAvailable(),
      connectUrl: `/auth/google?next=${encodeURIComponent(ACCOUNT_PATH)}`,
    },
    {
      id: "apple" as const,
      label: "Apple",
      available: isAppleSignInAvailable(),
      connectUrl: `/auth/apple?next=${encodeURIComponent(ACCOUNT_PATH)}`,
    },
  ].filter((p) => p.available || identity(p.id));

  return (
    <div>
      {updated === "password" && (
        <Notice tone="success" className="mb-6">
          Your password has been updated.
        </Notice>
      )}
      {link === "error" && (
        <Notice tone="error" className="mb-6">
          That account wasn’t connected. Try again when you’re ready.
        </Notice>
      )}

      <SettingsSection title="Email">
        <Lead className="mt-2">
          You sign in and get Pigxel emails at{" "}
          <span className="font-medium break-words text-foreground">
            {user.email ?? "no email yet"}
          </span>
          .
        </Lead>
        {user.new_email && (
          <Lead className="mt-2">
            Waiting for you to confirm {user.new_email} from both inboxes.
          </Lead>
        )}
        <EmailForm current={user.email ?? null} />
      </SettingsSection>

      <SettingsSection title="Password">
        <Lead className="mt-2">
          {hasPassword
            ? "Change the password you use with your email."
            : "Add a password to also sign in with your email."}
        </Lead>
        <Link
          href="/auth/update-password"
          className={`mt-4 ${secondaryButton}`}
        >
          {hasPassword ? "Change password" : "Set a password"}
        </Link>
      </SettingsSection>

      {providers.length > 0 && (
        <SettingsSection title="Connected accounts">
          <Lead className="mt-2">
            Sign in to Pigxel with these as well as your email.
          </Lead>
          <ul className="mt-4 divide-y rounded-lg border">
            {providers.map((p) => {
              const linked = identity(p.id);
              return (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{p.label}</p>
                    <Text size="xs" tone="muted">
                      {linked
                        ? (identityEmail(p.id) ?? "Connected")
                        : "Not connected"}
                    </Text>
                  </div>
                  {!linked ? (
                    <a href={p.connectUrl} className={secondaryButton}>
                      Connect {p.label}
                    </a>
                  ) : canUnlink ? (
                    <UnlinkButton provider={p.id} label={p.label} />
                  ) : (
                    <Text
                      size="xs"
                      tone="muted"
                      className="max-w-48 text-right"
                    >
                      Your only way to sign in
                    </Text>
                  )}
                </li>
              );
            })}
          </ul>
        </SettingsSection>
      )}

      <SettingsSection title="Sign out">
        <Lead className="mt-2 mb-4">Sign out of Pigxel on this device.</Lead>
        <SignOutButton />
      </SettingsSection>

      <SettingsSection id="your-data" title="Your data">
        <Lead className="mt-2 mb-4">
          Download a ZIP of everything Pigxel stores about you: your profile,
          tiles as .pigxel files, comments, likes, AI chats and more.
        </Lead>
        {/* A plain link: the browser downloads the file. */}
        <a href="/api/account/export" download className={secondaryButton}>
          Download my data
        </a>
      </SettingsSection>

      <SettingsSection id="delete-account" title="Delete account">
        <Lead className="mt-2">
          This permanently deletes your account, profile, saved tiles and their
          versions, published art, comments, likes, collections and AI chats.
          Projects you share are removed for the people you shared them with. It
          can’t be undone.
        </Lead>
        <ul className="mt-3 mb-5 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Download your data first if you want to keep anything.</li>
          <li>
            A paid plan is cancelled right away. For a refund within the refund
            period, see the{" "}
            <Link href="/refunds" className="underline underline-offset-2">
              Refund Policy
            </Link>{" "}
            before deleting.
          </li>
          <li>Unsaved drafts in this browser aren’t touched.</li>
        </ul>
        <DeleteAccountForm />
      </SettingsSection>
    </div>
  );
}
