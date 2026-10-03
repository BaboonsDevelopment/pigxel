import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMessage } from "@pigxel/ui/components/field";
import Link from "next/link";
import { AuthPage } from "@/features/auth/components/auth-page";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HOME_PATH } from "@/lib/auth/routes";
import { connectDriveUrl } from "@/lib/google-drive/status";
import {
  isDriveAvailable,
  isGoogleSignInAvailable,
} from "@/lib/google-drive/server";
import { isAppleSignInAvailable } from "@/lib/auth/apple";
import { AuthForm } from "@/features/auth/components/auth-form";
import {
  AppleLogo,
  GoogleLogo,
  ProviderButton,
} from "@/features/auth/components/provider-button";
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
  const google = isGoogleSignInAvailable();
  const apple = isAppleSignInAvailable();
  const authMode: AuthMode =
    mode === "signup" || mode === "forgot" ? mode : "login";
  const copy = {
    login: ["Welcome back", undefined],
    signup: [
      "Create your free account",
      "Draw, animate and keep your pixel art. No credit card needed.",
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
      {authMode !== "forgot" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <ProviderButton
              href={google ? connectDriveUrl(HOME_PATH) : undefined}
              logo={<GoogleLogo />}
              name="Google"
              hint={
                isDriveAvailable()
                  ? "Also connects your Google Drive for saving tiles."
                  : undefined
              }
            />
            <ProviderButton
              href={
                apple
                  ? `/auth/apple?next=${encodeURIComponent(HOME_PATH)}`
                  : undefined
              }
              logo={<AppleLogo />}
              name="Apple"
            />
          </div>
          <div className="my-6 flex items-center gap-3 text-sm text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}
      <AuthForm key={authMode} mode={authMode} configured={configured} />
      {authMode !== "forgot" && (
        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing, you agree to Pigxel’s{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Privacy Policy
          </Link>
          .
        </p>
      )}
    </AuthPage>
  );
}
