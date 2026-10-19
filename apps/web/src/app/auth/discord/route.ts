import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { authUrl } from "@/lib/auth/config";
import {
  discordAuthorizeUrl,
  discordConfig,
  DISCORD_STATE_COOKIE,
} from "@/features/discord/config";

export async function GET() {
  const user = await requireUser();
  if (!discordConfig())
    return NextResponse.redirect(
      authUrl("/settings/perks?discord=unavailable"),
    );
  const state = randomBytes(32).toString("hex");
  const response = NextResponse.redirect(discordAuthorizeUrl(state));
  response.cookies.set(DISCORD_STATE_COOKIE, `${state}:${user.id}`, {
    httpOnly: true,
    secure: new URL(authUrl("/")).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
