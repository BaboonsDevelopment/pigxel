import { NextResponse, type NextRequest } from "next/server";
import { failed, guard, publishApproved } from "@/features/asset-review/server";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return NextResponse.json({ output: await publishApproved() });
  } catch (e) {
    return failed(e);
  }
}
