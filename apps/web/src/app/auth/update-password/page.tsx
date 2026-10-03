import Link from "next/link";
import { redirect } from "next/navigation";
import { textLinkClassName } from "@pigxel/ui/components/typography";
import { AuthPage } from "@/features/auth/components/auth-page";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PasswordForm } from "@/features/auth/components/password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Update password · Pigxel" };

export default async function UpdatePassword() {
  if (!isSupabaseConfigured()) redirect("/login?mode=forgot");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/login?mode=forgot&error=expired");
  return (
    <AuthPage
      title="Choose a new password."
      description="Save your password to continue to your account."
    >
      <PasswordForm />
      <Link
        href="/settings/account"
        className={`mt-6 text-center text-sm ${textLinkClassName}`}
      >
        Back to your account
      </Link>
    </AuthPage>
  );
}
