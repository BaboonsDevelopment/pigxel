import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HOME_PATH } from "@/lib/auth/routes";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { isGoogleSignInAvailable } from "@/lib/google-drive/server";
import { AuthForm } from "./auth-form";
import type { AuthMode } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Log in · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; error?: string }>;
}) {
  const { mode, error } = await searchParams;
  const configured = isSupabaseConfigured();
  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(HOME_PATH);
  }
  const authMode: AuthMode =
    mode === "signup" || mode === "forgot" ? mode : "login";
  const copy = {
    login: ["Welcome back.", "Log in to your Pigxel account."],
    signup: [
      "Make yourself at home.",
      "Create your Pigxel account with your email and password.",
    ],
    forgot: [
      "Forgot your password?",
      "We’ll email you a link to choose a new password.",
    ],
  }[authMode];
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-12">
        <Brand />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{copy[0]}</h1>
      <p className="mt-3 mb-8 text-sm leading-relaxed text-muted-foreground">
        {copy[1]}
      </p>
      {error && (
        <p role="alert" className="mb-5 text-sm text-destructive">
          {error === "google"
            ? "Google sign-in didn’t finish. Try again, or use your email."
            : "This link is invalid or has expired. Request a new password reset link below."}
        </p>
      )}
      {authMode !== "forgot" && isGoogleSignInAvailable() && (
        <>
          <a
            href={connectDriveUrl(HOME_PATH)}
            className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border bg-background text-sm font-medium transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <GoogleLogo />
            Continue with Google
          </a>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Also connects your Google Drive for saving tiles.
          </p>
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <AuthForm key={authMode} mode={authMode} configured={configured} />
    </main>
  );
}

function GoogleLogo() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9Z"
      />
    </svg>
  );
}
