import { NextResponse, type NextRequest } from "next/server";
import {
  failed,
  guard,
  setProductionBackground,
} from "@/features/asset-review/server";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { background } = await request.json().catch(() => ({}));
    await setProductionBackground((await params).id, background ?? null);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
