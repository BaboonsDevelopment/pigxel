import "server-only";
import { isSupabaseAdminConfigured } from "@/lib/supabase/admin";

/**
 * The asset admin works only on a developer's machine: under `next dev`,
 * with the server key in .env.local. A production build never has it, so
 * the hosted site has no asset admin at all.
 */
export const isLocalAdmin = () =>
  process.env.NODE_ENV === "development" && isSupabaseAdminConfigured();
