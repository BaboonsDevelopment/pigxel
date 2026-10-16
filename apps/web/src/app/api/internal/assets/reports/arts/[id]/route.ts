import { NextResponse, type NextRequest } from "next/server";
import { resolveArt } from "@/features/asset-review/reports";
import { failed, guard } from "@/features/asset-review/server";

type Props = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { action } = await request.json().catch(() => ({}));
    await resolveArt((await params).id, action);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
