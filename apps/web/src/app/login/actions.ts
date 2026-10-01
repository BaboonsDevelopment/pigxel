"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { authUrl } from "@/lib/auth/config";
import { HOME_PATH } from "@/lib/auth/routes";
import type { AuthMode, AuthState } from "@/lib/auth/types";

export async function authenticate(
  mode: AuthMode,
  _state: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!["login", "signup", "forgot"].includes(mode))
    return { error: "Invalid request." };
  if (!isSupabaseConfigured())
    return { error: "Sign-in is not available yet. Please try again later." };
  const rawEmail = formData.get("email");
  if (
    typeof rawEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail.trim()) ||
    rawEmail.trim().length > 254
  ) {
    return { error: "Enter a valid email address." };
  }
  const email = rawEmail.trim();
  const reply = (state: AuthState) => ({ ...state, email });
  const password = formData.get("password");
  if (mode === "login" || mode === "signup") {
    if (typeof password !== "string" || !password || password.length > 128)
      return reply({ error: "Enter a password of up to 128 characters." });
    if (mode === "signup" && password.length < 8)
      return reply({ error: "Use at least 8 characters for your password." });
  }
  try {
    const supabase = await createClient();
    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authUrl("/auth/callback?next=/auth/update-password"),
      });
      if (
        error &&
        (error.status === 429 || error.code === "over_email_send_rate_limit")
      )
        return reply({
          error: "Too many email requests. Please wait a minute and try again.",
        });
      if (error && (!error.status || error.status >= 500))
        return reply({
          error: "We couldn’t send the email. Please try again later.",
        });
      // The same response for missing/existing accounts avoids account enumeration.
      return reply({
        message:
          "If an account exists for this email, you’ll receive a password reset link.",
      });
    }
    const credentials = { email, password: password as string };
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) {
        if (error.code === "user_already_exists")
          return reply({
            error: "An account with this email already exists. Log in instead.",
          });
        if (error.code === "weak_password")
          return reply({
            error:
              "Choose a stronger password that meets the account password requirements.",
          });
        if (error.status === 429)
          return reply({
            error:
              "Too many signup attempts. Please wait a minute and try again.",
          });
        return reply({
          error:
            "We couldn’t create your account. Please try again later, or log in if you already have an account.",
        });
      }
      // Signup signs the user in directly; Supabase must have email confirmation disabled.
      if (!data.session)
        return reply({
          error:
            "Your account was created but couldn’t be signed in. Please try logging in.",
        });
    } else {
      const { data, error } =
        await supabase.auth.signInWithPassword(credentials);
      if (error || !data.session)
        return reply({
          error:
            "Unable to log in. Check your email and password, or try again later.",
        });
    }
  } catch {
    return reply({
      error: "We couldn’t connect. Please try again in a moment.",
    });
  }
  revalidatePath("/", "layout");
  redirect(HOME_PATH);
}

export async function signOut(): Promise<AuthState> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Unable to sign out. Please try again." };
  } catch {
    return { error: "Unable to sign out. Please try again." };
  }
  revalidatePath("/", "layout");
  // Back to the landing page, the front door for signed-out visitors.
  redirect("/");
}
