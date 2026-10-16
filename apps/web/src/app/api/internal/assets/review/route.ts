import { NextResponse, type NextRequest } from "next/server";
import { failed, guard, setReview } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { key, status, note } = await request.json().catch(() => ({}));
    setReview(key, status, note);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
