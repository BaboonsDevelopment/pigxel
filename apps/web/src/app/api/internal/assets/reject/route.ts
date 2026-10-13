import { NextResponse, type NextRequest } from "next/server";
import { failed, guard, rejectTile } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { key } = await request.json().catch(() => ({}));
    rejectTile(key);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
