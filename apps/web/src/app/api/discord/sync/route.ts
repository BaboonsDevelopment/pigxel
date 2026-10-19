import { NextResponse } from "next/server";
import { discordConfig } from "@/features/discord/config";
import { syncDiscordBatch } from "@/features/discord/server";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!discordConfig()) return NextResponse.json({ skipped: "not_configured" });
  const result = await syncDiscordBatch();
  return NextResponse.json(result, { status: result.failed ? 500 : 200 });
}
