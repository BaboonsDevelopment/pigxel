import { NextResponse, type NextRequest } from "next/server";
import { createTag } from "@/features/asset-review/production";
import { failed, guard } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { name } = await request.json().catch(() => ({}));
    return NextResponse.json(await createTag(name));
  } catch (e) {
    return failed(e);
  }
}
