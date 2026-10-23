import { NextResponse, type NextRequest } from "next/server";
import { deletePack, updatePack } from "@/features/asset-review/production";
import { failed, guard } from "@/features/asset-review/server";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { name, description, background, premium, pinned } = await request
      .json()
      .catch(() => ({}));
    await updatePack((await params).id, {
      name,
      description,
      background,
      premium,
      pinned,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    await deletePack((await params).id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failed(e);
  }
}
