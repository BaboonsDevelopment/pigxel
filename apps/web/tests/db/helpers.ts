import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject, onTestFinished } from "vitest";

const { url, publishableKey, secretKey } = inject("supabase");
const noSession = { persistSession: false, autoRefreshToken: false };

/** Service-role client: bypasses row-level security, like server code with the secret key. */
export const admin = createClient(url, secretKey, { auth: noSession });

/** A visitor who isn't signed in. */
export const guest = (): SupabaseClient =>
  createClient(url, publishableKey, { auth: noSession });

/** Signs up a fresh person for this test; they and their data are deleted afterwards. */
export async function signUp(name = "artist") {
  const email = `${name}-${crypto.randomUUID().slice(0, 8)}@db.pigxel.test`;
  const password = crypto.randomUUID();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) throw created.error;
  const user = created.data.user;
  onTestFinished(async () => {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
  });
  const client = guest();
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  return { user, client };
}

/** A tile row with the columns the database requires. */
export const aTile = (overrides: Record<string, unknown> = {}) => ({
  name: "Test tile",
  width: 16,
  height: 16,
  ...overrides,
});
