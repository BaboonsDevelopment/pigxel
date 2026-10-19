"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getDiscordConnection,
  syncDiscordConnection,
  type DiscordConnection,
} from "./server";
import type { PerkState } from "@/features/membership/validation";

export async function retryDiscordSync(): Promise<PerkState> {
  const user = await requireUser();
  const connection = await getDiscordConnection(user.id);
  if (!connection) return { error: "Connect your Discord account first." };
  try {
    await syncDiscordConnection(connection);
  } catch {
    return {
      error:
        "Couldn’t update your Discord role. Join the server and try again.",
    };
  }
  revalidatePath("/settings/perks");
  return {};
}

export async function disconnectDiscord(): Promise<PerkState> {
  const user = await requireUser();
  const connection = await getDiscordConnection(user.id);
  if (!connection) return {};
  const { data: pending, error } = await createAdminClient()
    .from("discord_connections")
    .update({ disconnect_requested: true })
    .eq("id", connection.id)
    .eq("user_id", user.id)
    .select("*")
    .single<DiscordConnection>();
  if (error || !pending)
    return { error: "Couldn’t disconnect Discord. Try again." };
  try {
    await syncDiscordConnection(pending);
  } catch {
    revalidatePath("/settings/perks");
    return {
      error:
        "Disconnect is pending. We’ll retry removing your premium role automatically.",
    };
  }
  revalidatePath("/settings/perks");
  return {};
}
