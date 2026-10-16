import { NextResponse } from "next/server";
import { purgeTrashedTiles } from "@/features/tiles/remove-tiles";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET is not set.");
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const result = await purgeTrashedTiles();
  return NextResponse.json(result, { status: result.failed ? 500 : 200 });
}
