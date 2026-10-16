import { createClient } from "@supabase/supabase-js";
import { localSupabase } from "../../tests/support/local-supabase";
import { LEGAL, LEGAL_VERSION } from "../../src/features/legal/legal";

/** Every account the end-to-end tests create uses this domain. */
const DOMAIN = "e2e.pigxel.test";
export const PASSWORD = "correct-horse-battery-staple";

/** Where the setup project saves the signed-in browser state. */
export const AUTH_STATE = "e2e/.auth/user.json";

export type Account = { email: string; password: string };

export const newEmail = (name: string) =>
  `${name}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}@${DOMAIN}`;

function admin() {
  const { url, secretKey } = localSupabase();
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * A confirmed account made through the admin API, ready to log in with. It
 * has accepted the current Terms the way sign-up records it. With `plan`, it also gets an active
 * subscription, for tests that need that plan's room in Pigxel cloud.
 */
export async function createAccount(
  name: string,
  { plan }: { plan?: "starter" | "pro" | "advanced" } = {},
): Promise<Account> {
  const email = newEmail(name);
  const client = admin();
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { legal_version: LEGAL_VERSION },
  });
  if (error) throw error;
  const { error: acceptError } = await client.from("legal_acceptances").insert({
    user_id: data.user.id,
    terms_version: LEGAL_VERSION,
    privacy_version: LEGAL_VERSION,
    min_age: LEGAL.minAge,
    source: "signup",
  });
  if (acceptError) throw acceptError;
  if (plan) {
    const { error: planError } = await client.from("subscriptions").insert({
      id: `e2e-${data.user.id}`,
      user_id: data.user.id,
      customer_id: "e2e",
      product_id: "e2e",
      plan,
      status: "active",
      event_at: new Date().toISOString(),
    });
    if (planError) throw planError;
  }
  return { email, password: PASSWORD };
}

/** Deletes test accounts (their tiles and profiles go with them). */
export async function deleteAccounts(
  match = (email: string) => email.endsWith(`@${DOMAIN}`),
) {
  const client = admin();
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) throw error;
    const doomed = data.users.filter((user) => user.email && match(user.email));
    for (const user of doomed) {
      const { error: deleteError } = await client.auth.admin.deleteUser(
        user.id,
      );
      if (deleteError) throw deleteError;
    }
    if (data.users.length < 200) return;
    if (doomed.length) page--;
  }
}
