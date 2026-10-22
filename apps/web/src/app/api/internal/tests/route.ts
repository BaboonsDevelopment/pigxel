import { NextResponse, type NextRequest } from "next/server";
import { failed, guard } from "@/features/asset-review/server";
import { testsSnapshot } from "@/features/test-runs/server";

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(testsSnapshot());
  } catch (e) {
    return failed(e);
  }
}
