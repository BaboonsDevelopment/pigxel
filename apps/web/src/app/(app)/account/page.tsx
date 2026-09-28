import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getDriveStatus } from "@/lib/google-drive/server";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { disconnectDrive } from "./actions";
import { SignOutButton } from "./sign-out-button";

export const metadata: Metadata = { title: "Your account · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; drive?: string }>;
}) {
  const { updated, drive: driveResult } = await searchParams;
  const user = await requireUser();
  const drive = await getDriveStatus(user.id);
  return (
    <main className="mx-auto max-w-2xl px-6 py-10 md:px-10">
      <section className="pb-12">
        {updated === "password" && (
          <p
            role="status"
            className="mb-6 rounded-lg border bg-muted p-3 text-sm"
          >
            Your password has been updated.
          </p>
        )}
        <p className="mb-3 text-sm text-muted-foreground">You’re signed in</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome to Pigxel.
        </h1>
        <p className="mt-4 break-words text-muted-foreground">{user.email}</p>
        <p className="mt-6 mb-8 text-sm leading-relaxed text-muted-foreground">
          Your account is ready.
        </p>
        <div className="flex flex-wrap items-center gap-5">
          <SignOutButton />
          <Link href="/tiles" className="text-sm underline underline-offset-4">
            My projects
          </Link>
          <Link
            href="/auth/update-password"
            className="text-sm underline underline-offset-4"
          >
            Change password
          </Link>
        </div>
      </section>
      {drive.available && (
        <section aria-labelledby="drive-heading" className="border-t py-10">
          <h2 id="drive-heading" className="font-semibold">
            Google Drive
          </h2>
          {driveResult === "error" && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              Google Drive wasn’t connected. Try again when you’re ready.
            </p>
          )}
          {driveResult === "disconnected" && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Google Drive is disconnected. Your files stay in your Drive.
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {drive.connected
              ? `Tiles can be saved to and opened from the Google Drive of ${drive.email ?? "your Google account"}. Pigxel only sees files it created.`
              : "Link your Google account to save tiles in your own Google Drive, with autosave. Pigxel only sees files it creates."}
          </p>
          <div className="mt-5">
            {drive.connected ? (
              <form action={disconnectDrive}>
                <button
                  type="submit"
                  className="h-10 rounded-lg border px-4 text-sm font-medium hover:bg-muted"
                >
                  Disconnect Google Drive
                </button>
              </form>
            ) : (
              <a
                href={connectDriveUrl("/account")}
                className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium hover:bg-muted"
              >
                Connect Google Drive
              </a>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
