import { NextResponse, type NextRequest } from "next/server";
import { failed, guard, updateBlock } from "@/features/asset-review/server";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { name, premium, target, background } = await request
      .json()
      .catch(() => ({}));
    await updateBlock((await params).id, { name, premium, target, background });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
