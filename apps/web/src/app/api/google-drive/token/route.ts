import { NextResponse } from "next/server";
import {
  getDriveAccessToken,
  isDriveAvailable,
} from "@/lib/google-drive/server";
import { createClient } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "private, no-store" };

export async function POST() {
  if (!isDriveAvailable())
    return NextResponse.json(
      { error: "unavailable" },
      { status: 404, headers: noStore },
    );
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json(
      { error: "signed_out" },
      { status: 401, headers: noStore },
    );
  try {
    const token = await getDriveAccessToken(user.id);
    if (!token)
      return NextResponse.json(
        { error: "not_connected" },
        { status: 409, headers: noStore },
      );
    return NextResponse.json(token, { headers: noStore });
  } catch {
    return NextResponse.json(
      { error: "google_unreachable" },
      { status: 502, headers: noStore },
    );
  }
}
