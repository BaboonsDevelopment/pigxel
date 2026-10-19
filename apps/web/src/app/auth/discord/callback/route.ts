import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/config";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  discordCallbackUrl,
  discordConfig,
  DISCORD_API,
  DISCORD_STATE_COOKIE,
  SNOWFLAKE,
} from "@/features/discord/config";
import {
  getDiscordConnection,
  syncDiscordForUser,
} from "@/features/discord/server";

export async function GET(request: Request) {
  const user = await requireUser();
  const params = new URL(request.url).searchParams;
  const cookieStore = await cookies();
  const expected = cookieStore.get(DISCORD_STATE_COOKIE)?.value;
  cookieStore.delete(DISCORD_STATE_COOKIE);
  const returned = `${params.get("state") ?? ""}:${user.id}`;
  const back = (status: string) =>
    NextResponse.redirect(authUrl(`/settings/perks?discord=${status}`));
  if (
    !expected ||
    Buffer.byteLength(expected) !== Buffer.byteLength(returned) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(returned))
  )
    return back("invalid_state");
  if (params.get("error")) return back("cancelled");
  if (params.get("iss") && params.get("iss") !== "https://discord.com")
    return back("invalid_state");
  const config = discordConfig();
  const code = params.get("code");
  if (!config || !code) return back("unavailable");
  try {
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: discordCallbackUrl(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!tokenResponse.ok) return back("failed");
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!token.access_token) return back("failed");
    try {
      const identityResponse = await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(8_000),
      });
      if (!identityResponse.ok) return back("failed");
      const identity = (await identityResponse.json()) as {
        id: string;
        username: string;
      };
      if (!SNOWFLAKE.test(identity.id) || typeof identity.username !== "string")
        return back("failed");
      const existing = await getDiscordConnection(user.id);
      if (
        existing &&
        (existing.discord_user_id !== identity.id ||
          existing.disconnect_requested)
      )
        return back("disconnect_first");
      const admin = createAdminClient();
      const { error } = existing
        ? await admin
            .from("discord_connections")
            .update({ username: identity.username })
            .eq("id", existing.id)
        : await admin
            .from("discord_connections")
            .insert({
              user_id: user.id,
              discord_user_id: identity.id,
              username: identity.username,
            });
      if (error) return back("failed");
      try {
        await syncDiscordForUser(user.id);
      } catch {
        return back("sync_pending");
      }
      return back("connected");
    } finally {
      await fetch("https://discord.com/api/oauth2/token/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: config.clientId,
          client_secret: config.clientSecret,
          token: token.access_token,
          token_type_hint: "access_token",
        }),
        signal: AbortSignal.timeout(8_000),
      }).catch(() => undefined);
    }
  } catch {
    return back("failed");
  }
}
