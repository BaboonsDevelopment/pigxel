import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { PasswordForm } from "./password-form";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-12">
        <Brand />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Choose a new password.
      </h1>
      <p className="mt-3 mb-8 text-sm text-muted-foreground">
        Save your password to continue to your account.
      </p>
      <PasswordForm />
      <Link
        href="/account"
        className="mt-6 text-center text-sm underline underline-offset-4"
      >
        Back to your account
      </Link>
    </main>
  );
}
