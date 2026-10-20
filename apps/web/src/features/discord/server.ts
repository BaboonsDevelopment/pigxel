import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { planOfProduct } from "@/features/billing/subscription";
import {
  discordConfig,
  DISCORD_API,
  SNOWFLAKE,
  type DiscordRole,
} from "./config";

export type DiscordConnection = {
  id: string;
  user_id: string | null;
  discord_user_id: string;
  username: string;
  disconnect_requested: boolean;
  synced_premium: boolean;
  /** The role last seen in Discord: one the bot gave, or a Creator's. */
  synced_role?: DiscordRole | "creator" | null;
  last_error: string | null;
  last_synced_at: string | null;
  sync_version?: number;
};

export async function getDiscordConnection(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("discord_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DiscordConnection>();
  if (error) throw new Error("Couldn’t load your Discord connection.");
  return data;
}

/**
 * The role someone's paid plans earn: Pro for any AI plan (Starter, Pro or
 * Advanced), else Artist. Match the billing environment: sandbox
 * subscriptions never grant live roles.
 */
export async function discordRoleFor(
  userId: string,
): Promise<DiscordRole | null> {
  const mode = process.env.CREEM_API_KEY?.startsWith("creem_test_")
    ? "test"
    : "live";
  const { data, error } = await createAdminClient()
    .from("subscriptions")
    .select("product_id")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .returns<{ product_id: string }[]>();
  if (error) throw new Error("Couldn’t check Discord role eligibility.");
  const plans = data.flatMap(
    (row) => planOfProduct(row.product_id, mode)?.name ?? [],
  );
  if (plans.some((plan) => plan !== "Artist")) return "pro";
  return plans.length ? "artist" : null;
}

const roleFailed = (status: number) =>
  new Error(`Discord role update failed (${status}). Please retry.`);

export async function syncDiscordConnection(connection: DiscordConnection) {
  const config = discordConfig();
  if (!config || !SNOWFLAKE.test(connection.discord_user_id))
    throw new Error("Discord is not configured.");
  const admin = createAdminClient();
  try {
    const linked = !!connection.user_id && !connection.disconnect_requested;
    const earned = linked ? await discordRoleFor(connection.user_id!) : null;
    const headers = { Authorization: `Bot ${config.botToken}` };
    const member = `${DISCORD_API}/guilds/${config.guildId}/members/${connection.discord_user_id}`;
    // Read the member first, then change only the roles that differ.
    const found = await fetch(member, {
      headers,
      signal: AbortSignal.timeout(8_000),
    });
    let role: DiscordConnection["synced_role"] = null;
    if (found.status === 404) {
      // Not in the server: nothing to remove, but nowhere to add a role.
      if (earned)
        throw new Error("Join the Pigxel Discord server, then retry.");
    } else {
      if (!found.ok) throw roleFailed(found.status);
      const { roles: has } = (await found.json()) as { roles: string[] };
      // Creators' roles are given by hand; they hold no Artist or Pro role.
      const creator =
        linked && !!config.creatorRoleId && has.includes(config.creatorRoleId);
      const wanted = creator ? null : earned;
      for (const [name, id] of Object.entries(config.roles) as [
        DiscordRole,
        string,
      ][]) {
        const want = name === wanted;
        if (want === has.includes(id)) continue;
        const response = await fetch(`${member}/roles/${id}`, {
          method: want ? "PUT" : "DELETE",
          headers,
          signal: AbortSignal.timeout(8_000),
        });
        if (!response.ok && !(response.status === 404 && !want))
          throw roleFailed(response.status);
      }
      role = creator ? "creator" : wanted;
    }
    const result =
      connection.disconnect_requested || !connection.user_id
        ? await admin
            .from("discord_connections")
            .delete()
            .eq("id", connection.id)
            .eq("sync_version", connection.sync_version ?? 0)
        : await admin
            .from("discord_connections")
            .update({
              synced_premium: role === "artist" || role === "pro",
              synced_role: role,
              last_synced_at: new Date().toISOString(),
              last_error: null,
            })
            .eq("id", connection.id)
            .eq("sync_version", connection.sync_version ?? 0);
    if (result.error)
      throw new Error("Couldn’t save Discord connection status.");
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Discord role update failed. Please retry.";
    await admin
      .from("discord_connections")
      .update({ last_error: message, last_synced_at: new Date().toISOString() })
      .eq("id", connection.id)
      .eq("sync_version", connection.sync_version ?? 0);
    throw error;
  }
}

export async function syncDiscordForUser(userId: string) {
  if (!discordConfig()) return;
  const { data, error } = await createAdminClient()
    .from("discord_connections")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DiscordConnection>();
  if (error) throw new Error("Couldn’t find the Discord connection.");
  if (data) await syncDiscordConnection(data);
}

export async function syncDiscordBatch() {
  const { data, error } = await createAdminClient()
    .from("discord_connections")
    .select("*")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(12)
    .returns<DiscordConnection[]>();
  if (error) throw new Error("Couldn’t load Discord synchronization jobs.");
  let failed = 0;
  for (let i = 0; i < data.length; i += 3) {
    const results = await Promise.allSettled(
      data.slice(i, i + 3).map(syncDiscordConnection),
    );
    failed += results.filter((result) => result.status === "rejected").length;
  }
  return { processed: data.length, failed };
}
