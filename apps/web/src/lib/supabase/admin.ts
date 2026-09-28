import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Whether the server has the secret key for admin-only tables. */
export function isSupabaseAdminConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}

/** A Supabase client with the secret key. Bypasses RLS: server code only. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key)
    throw new Error("Set SUPABASE_SECRET_KEY in apps/web/.env.local.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
