import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "@test/supabase";
import { TIERS } from "@/features/billing/pricing";
const mocks = vi.hoisted(() => ({ cookie: "", deleteCookie: vi.fn() }));
vi.mock(
  "@/lib/supabase/server",
  async () => (await import("@test/supabase")).supabaseModules.server,
);
vi.mock(
  "@/lib/supabase/admin",
  async () => (await import("@test/supabase")).supabaseModules.admin,
);
vi.mock("@/lib/auth/session", () => ({
  requireUser: async () => ({ id: "member" }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => (mocks.cookie ? { value: mocks.cookie } : undefined),
    delete: mocks.deleteCookie,
  }),
}));

import {
  discordAuthorizeUrl,
  discordInviteUrl,
} from "@/features/discord/config";
import {
  discordPremiumFor,
  syncDiscordConnection,
  type DiscordConnection,
} from "@/features/discord/server";
import { GET as callback } from "@/app/auth/discord/callback/route";

const connection: DiscordConnection = {
  id: "connection",
  user_id: "member",
  discord_user_id: "123456789012345678",
  username: "artist",
  disconnect_requested: false,
  synced_premium: false,
  last_error: null,
  last_synced_at: null,
};
beforeEach(() => {
  for (const [key, value] of Object.entries({
    APP_URL: "https://pigxel.test",
    DISCORD_CLIENT_ID: "123456789012345678",
    DISCORD_CLIENT_SECRET: "test-client-secret",
    DISCORD_BOT_TOKEN: "test-bot-token",
    DISCORD_GUILD_ID: "223456789012345678",
    DISCORD_PREMIUM_ROLE_ID: "323456789012345678",
    CREEM_API_KEY: "creem_test_example",
  }))
    vi.stubEnv(key, value);
  mocks.cookie = "nonce:member";
});

describe("Discord roles", () => {
  it("does not grant live roles based on sandbox subscriptions", async () => {
    supabase.respond("subscriptions", {
      data: [{ product_id: TIERS[0]!.productId.month }],
    });
    vi.stubEnv("CREEM_API_KEY", "creem_example");
    expect(await discordPremiumFor("member")).toBe(false);
    vi.stubEnv("CREEM_API_KEY", "creem_test_example");
    expect(await discordPremiumFor("member")).toBe(true);
  });

  it("adds only the configured premium role and records successful synchronization", async () => {
    supabase.respond("subscriptions", {
      data: [{ product_id: TIERS[0]!.productId.month }],
    });
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    await syncDiscordConnection(connection);
    expect(fetcher).toHaveBeenCalledWith(
      "https://discord.com/api/v10/guilds/223456789012345678/members/123456789012345678/roles/323456789012345678",
      expect.objectContaining({ method: "PUT" }),
    );
    expect(supabase.callsTo("discord_connections.update")[0]).toMatchObject({
      values: expect.objectContaining({
        synced_premium: true,
        last_error: null,
      }),
    });
  });

  it("removes the role and cleans up connections after account deletion", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetcher);
    await syncDiscordConnection({ ...connection, user_id: null });
    expect(fetcher).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(supabase.callsTo("discord_connections.delete")).toHaveLength(1);
  });

  it("does not clear a newer pending role change with an older API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    await syncDiscordConnection({ ...connection, sync_version: 7 });
    expect(supabase.callsTo("discord_connections.update")[0]).toMatchObject({
      filters: expect.arrayContaining([["eq", "sync_version", 7]]),
    });
  });

  it("keeps failed disconnections available for automatic retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 403 })),
    );
    await expect(
      syncDiscordConnection({ ...connection, disconnect_requested: true }),
    ).rejects.toThrow("Discord role update failed");
    expect(supabase.callsTo("discord_connections.delete")).toHaveLength(0);
    expect(supabase.callsTo("discord_connections.update")[0]).toMatchObject({
      values: expect.objectContaining({ last_error: expect.any(String) }),
    });
  });

  it("treats removal for a user no longer in the server as complete", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 404 })),
    );
    await syncDiscordConnection({ ...connection, disconnect_requested: true });
    expect(supabase.callsTo("discord_connections.delete")).toHaveLength(1);
  });
});

describe("Discord linking", () => {
  it("requests only identity access and uses the configured callback origin", () => {
    const url = new URL(discordAuthorizeUrl("nonce"));
    expect(url.searchParams.get("scope")).toBe("identify");
    expect(url.searchParams.get("redirect_uri")).toBe(
      "https://pigxel.test/auth/discord/callback",
    );
  });

  it("rejects invalid state, changed sessions, and Unicode state without calling Discord", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    for (const [cookie, state] of [
      ["", "nonce"],
      ["nonce:someone_else", "nonce"],
      ["nonce:member", "nönce"],
    ]) {
      mocks.cookie = cookie!;
      const response = await callback(
        new Request(
          `https://pigxel.test/auth/discord/callback?state=${encodeURIComponent(state!)}&code=code`,
        ),
      );
      expect(response.headers.get("location")).toContain(
        "discord=invalid_state",
      );
    }
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("stores the verified Discord identity and revokes the temporary OAuth token", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ access_token: "temporary-test-token" }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "123456789012345678", username: "discord_artist" }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    const response = await callback(
      new Request(
        "https://pigxel.test/auth/discord/callback?state=nonce&code=code&iss=https%3A%2F%2Fdiscord.com",
      ),
    );
    expect(response.headers.get("location")).toContain("discord=connected");
    expect(supabase.callsTo("discord_connections.insert")[0]).toMatchObject({
      values: {
        user_id: "member",
        discord_user_id: "123456789012345678",
        username: "discord_artist",
      },
    });
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://discord.com/api/oauth2/token/revoke",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("only accepts first-party Discord invite URLs", () => {
    vi.stubEnv("DISCORD_INVITE_URL", "https://discord.gg/pigxel");
    expect(discordInviteUrl()).toBe("https://discord.gg/pigxel");
    vi.stubEnv("DISCORD_INVITE_URL", "https://discord.gg.evil.test/pigxel");
    expect(discordInviteUrl()).toBeNull();
  });
});
