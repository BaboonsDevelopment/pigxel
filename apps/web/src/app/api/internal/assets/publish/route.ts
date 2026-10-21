import { NextResponse, type NextRequest } from "next/server";
import { failed, getPublishStatus, guard, publishApproved } from "@/features/asset-review/server";

export const maxDuration = 900;

export async function GET(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  return NextResponse.json(getPublishStatus());
}

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  if (getPublishStatus().running)
    return NextResponse.json({ inProgress: true });
  try {
    return NextResponse.json({ output: await publishApproved() });
  } catch (e) {
    return failed(e);
  }
}
