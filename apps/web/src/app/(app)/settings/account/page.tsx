import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { Notice } from "@pigxel/ui/components/notice";
import { Lead, SectionTitle } from "@pigxel/ui/components/typography";
import { isAppleSignInAvailable } from "@/lib/auth/apple";
import { requireUser } from "@/lib/auth/session";
import {
  getDriveStatus,
  isGoogleSignInAvailable,
} from "@/lib/google-drive/server";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { EmailForm, UnlinkButton } from "./account-forms";
import { disconnectDrive } from "./actions";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Account settings · Pigxel" };
export const dynamic = "force-dynamic";

const ACCOUNT_PATH = "/settings/account";
const secondaryButton = buttonVariants({ variant: "secondary" });

export default async function AccountSettings({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; drive?: string; link?: string }>;
}) {
  const { updated, drive: driveResult, link } = await searchParams;
  const user = await requireUser();
  const drive = await getDriveStatus(user.id);
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
      connectUrl: connectDriveUrl(ACCOUNT_PATH),
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

      <Section title="Email">
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
      </Section>

      <Section title="Password">
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
      </Section>

      {providers.length > 0 && (
        <Section title="Connected accounts">
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
                    <p className="text-xs text-muted-foreground">
                      {linked
                        ? (identityEmail(p.id) ?? "Connected")
                        : "Not connected"}
                    </p>
                  </div>
                  {!linked ? (
                    <a href={p.connectUrl} className={secondaryButton}>
                      Connect {p.label}
                    </a>
                  ) : canUnlink ? (
                    <UnlinkButton provider={p.id} label={p.label} />
                  ) : (
                    <p className="max-w-48 text-right text-xs text-muted-foreground">
                      Your only way to sign in
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {drive.available && (
        <Section title="Google Drive">
          {driveResult === "error" && (
            <FormMessage tone="error" className="mt-3">
              Google Drive wasn’t connected. Try again when you’re ready.
            </FormMessage>
          )}
          {driveResult === "disconnected" && (
            <FormMessage role="status" className="mt-3">
              Google Drive is disconnected. Your files stay in your Drive.
            </FormMessage>
          )}
          <Lead className="mt-3">
            {drive.connected
              ? `Tiles can be saved to and opened from the Google Drive of ${drive.email ?? "your Google account"}. Pigxel only sees files it created.`
              : "Link your Google account to save tiles in your own Google Drive, with autosave. Pigxel only sees files it creates."}
          </Lead>
          <div className="mt-4">
            {drive.connected ? (
              <form action={disconnectDrive}>
                <button type="submit" className={secondaryButton}>
                  Disconnect Google Drive
                </button>
              </form>
            ) : (
              <a
                href={connectDriveUrl(ACCOUNT_PATH)}
                className={secondaryButton}
              >
                Connect Google Drive
              </a>
            )}
          </div>
        </Section>
      )}

      <Section title="Sign out">
        <Lead className="mt-2 mb-4">Sign out of Pigxel on this device.</Lead>
        <SignOutButton />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b py-8 first-of-type:pt-0 last:border-b-0">
      <SectionTitle>{title}</SectionTitle>
      {children}
    </section>
  );
}
