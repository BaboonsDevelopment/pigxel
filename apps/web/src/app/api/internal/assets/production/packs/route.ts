import { NextResponse, type NextRequest } from "next/server";
import { createPack } from "@/features/asset-review/production";
import { failed, guard } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { name, description } = await request.json().catch(() => ({}));
    return NextResponse.json(await createPack({ name, description }));
  } catch (e) {
    return failed(e);
  }
}
