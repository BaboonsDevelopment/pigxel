import { NextResponse, type NextRequest } from "next/server";
import { listReports } from "@/features/asset-review/reports";
import { failed, guard } from "@/features/asset-review/server";

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json(await listReports());
  } catch (e) {
    return failed(e);
  }
}
