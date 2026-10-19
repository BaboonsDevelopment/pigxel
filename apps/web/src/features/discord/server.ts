import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { planOfProduct } from "@/features/billing/subscription";
import { discordConfig, DISCORD_API, SNOWFLAKE } from "./config";

export type DiscordConnection = {
  id: string;
  user_id: string | null;
  discord_user_id: string;
  username: string;
  disconnect_requested: boolean;
  synced_premium: boolean;
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

/** Match the billing environment: sandbox subscriptions never grant live roles. */
export async function discordPremiumFor(userId: string): Promise<boolean> {
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
  return data.some((row) => planOfProduct(row.product_id, mode) !== null);
}

export async function syncDiscordConnection(connection: DiscordConnection) {
  const config = discordConfig();
  if (!config || !SNOWFLAKE.test(connection.discord_user_id))
    throw new Error("Discord is not configured.");
  const admin = createAdminClient();
  try {
    const premium =
      !!connection.user_id &&
      !connection.disconnect_requested &&
      (await discordPremiumFor(connection.user_id));
    const response = await fetch(
      `${DISCORD_API}/guilds/${config.guildId}/members/${connection.discord_user_id}/roles/${config.roleId}`,
      {
        method: premium ? "PUT" : "DELETE",
        headers: { Authorization: `Bot ${config.botToken}` },
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (!response.ok && !(response.status === 404 && !premium))
      throw new Error(
        response.status === 404
          ? "Join the Pigxel Discord server, then retry."
          : `Discord role update failed (${response.status}). Please retry.`,
      );
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
              synced_premium: premium,
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
