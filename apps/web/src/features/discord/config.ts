import "server-only";
import { authUrl } from "@/lib/auth/config";

export const SNOWFLAKE = /^[0-9]{17,20}$/;
export const DISCORD_API = "https://discord.com/api/v10";
export const DISCORD_STATE_COOKIE = "pigxel-discord-state";

/** The Discord roles the bot hands out, one per person, by paid plan. */
export type DiscordRole = "artist" | "pro";

export function discordConfig() {
  const {
    DISCORD_CLIENT_ID: clientId,
    DISCORD_CLIENT_SECRET: clientSecret,
    DISCORD_BOT_TOKEN: botToken,
    DISCORD_GUILD_ID: guildId,
    DISCORD_ARTIST_ROLE_ID: artist,
    DISCORD_PRO_ROLE_ID: pro,
    DISCORD_CREATOR_ROLE_ID: creator,
  } = process.env;
  return clientId &&
    SNOWFLAKE.test(clientId) &&
    clientSecret &&
    botToken &&
    guildId &&
    SNOWFLAKE.test(guildId) &&
    artist &&
    SNOWFLAKE.test(artist) &&
    pro &&
    SNOWFLAKE.test(pro) &&
    artist !== pro
    ? {
        clientId,
        clientSecret,
        botToken,
        guildId,
        roles: { artist, pro } satisfies Record<DiscordRole, string>,
        /**
         * Optional. Creators are given their role by hand; the bot only reads
         * it, and leaves Creators without an Artist or Pro role.
         */
        creatorRoleId: creator && SNOWFLAKE.test(creator) ? creator : null,
      }
    : null;
}
export const discordCallbackUrl = () => authUrl("/auth/discord/callback");

export function discordAuthorizeUrl(state: string) {
  const config = discordConfig();
  if (!config) throw new Error("Discord is not configured.");
  return `https://discord.com/oauth2/authorize?${new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: discordCallbackUrl(),
    response_type: "code",
    scope: "identify",
    state,
  })}`;
}

export function discordInviteUrl(): string | null {
  try {
    const url = new URL(process.env.DISCORD_INVITE_URL ?? "");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (url.hostname === "discord.gg" ||
        (url.hostname === "discord.com" && url.pathname.startsWith("/invite/")))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}
