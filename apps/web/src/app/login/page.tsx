import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buttonVariants } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { AuthPage } from "@/components/auth-page";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HOME_PATH } from "@/lib/auth/routes";
import { connectDriveUrl } from "@/lib/google-drive/status";
import { isGoogleSignInAvailable } from "@/lib/google-drive/server";
import { isAppleSignInAvailable } from "@/lib/auth/apple";
import { AuthForm } from "./auth-form";
import type { AuthMode } from "@/lib/auth/types";

export const metadata: Metadata = { title: "Log in · Pigxel" };

const providerButton = buttonVariants({
  variant: "secondary",
  size: "lg",
  className: "w-full gap-3",
});
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
  const google = isGoogleSignInAvailable();
  const apple = isAppleSignInAvailable();
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
    <AuthPage title={copy[0]} description={copy[1]}>
      {error && (
        <FormMessage tone="error" className="mb-5">
          {error === "google"
            ? "Google sign-in didn’t finish. Try again, or use your email."
            : error === "apple"
              ? "Apple sign-in didn’t finish. Try again, or use your email."
              : "This link is invalid or has expired. Request a new password reset link below."}
        </FormMessage>
      )}
      {authMode !== "forgot" && (google || apple) && (
        <>
          {google && (
            <>
              <a href={connectDriveUrl(HOME_PATH)} className={providerButton}>
                <GoogleLogo />
                Continue with Google
              </a>
              <FormMessage className="mt-2 text-center text-xs">
                Also connects your Google Drive for saving tiles.
              </FormMessage>
            </>
          )}
          {apple && (
            <a
              href={`/auth/apple?next=${encodeURIComponent(HOME_PATH)}`}
              className={`${providerButton} ${google ? "mt-4" : ""}`}
            >
              <AppleLogo />
              Continue with Apple
            </a>
          )}
          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or with email
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <AuthForm key={authMode} mode={authMode} configured={configured} />
    </AuthPage>
  );
}

function AppleLogo() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5"
      fill="currentColor"
    >
      <path d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9a4.8 4.8 0 0 0-3.8-2c-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9a5 5 0 0 0-4.2 2.6c-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8s2 .8 3.4.8c1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.6-4.1ZM13.9 5.1a4.6 4.6 0 0 0 1.1-3.3 4.7 4.7 0 0 0-3.1 1.6 4.4 4.4 0 0 0-1.1 3.2c1.2.1 2.3-.6 3.1-1.5Z" />
    </svg>
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
