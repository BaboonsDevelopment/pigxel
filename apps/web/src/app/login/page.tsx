import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { HOME_PATH } from "@/lib/auth/routes";
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
          This link is invalid or has expired. Request a new password reset link
          below.
        </p>
      )}
      <AuthForm key={authMode} mode={authMode} configured={configured} />
    </main>
  );
}
