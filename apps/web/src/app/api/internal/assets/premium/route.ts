import { NextResponse, type NextRequest } from "next/server";
import { failed, guard, setTilePremium } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { key, premium } = await request.json().catch(() => ({}));
    setTilePremium(key, premium);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
