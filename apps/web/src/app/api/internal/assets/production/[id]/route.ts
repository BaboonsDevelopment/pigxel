import { NextResponse, type NextRequest } from "next/server";
import {
  failed,
  guard,
  removeFromProduction,
} from "@/features/asset-review/server";

type Props = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    await removeFromProduction((await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
