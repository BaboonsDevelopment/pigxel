import type { NextRequest } from "next/server";
import { failed, guard, stripPng } from "@/features/asset-review/server";

type Props = { params: Promise<{ pack: string; id: string }> };

export async function GET(request: NextRequest, { params }: Props) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    const { pack, id } = await params;
    return new Response(stripPng(pack, id), {
      headers: { "content-type": "image/png", "cache-control": "private, max-age=31536000, immutable" },
    });
  } catch (e) {
    return failed(e);
  }
}
