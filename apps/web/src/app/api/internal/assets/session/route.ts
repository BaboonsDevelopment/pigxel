import { NextResponse, type NextRequest } from "next/server";
import { REVIEW_COOKIE } from "@/features/asset-review/constants";
import { isReviewKey, isReviewOpen } from "@/features/asset-review/server";

export async function POST(request: NextRequest) {
  if (!isReviewOpen()) return new NextResponse(null, { status: 404 });
  const { key } = await request.json().catch(() => ({}));
  if (typeof key !== "string" || !isReviewKey(key))
    return NextResponse.json({ error: "Wrong key." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(REVIEW_COOKIE, key, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(REVIEW_COOKIE);
  return response;
}
