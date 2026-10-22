import { NextResponse, type NextRequest } from "next/server";
import { failed, guard } from "@/features/asset-review/server";
import { startRun, stopRun } from "@/features/test-runs/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { suite } = await request.json().catch(() => ({}));
    return NextResponse.json(startRun(suite));
  } catch (e) {
    return failed(e);
  }
}

export async function DELETE(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    stopRun();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
