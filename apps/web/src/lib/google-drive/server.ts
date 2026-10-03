import "server-only";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  createAdminClient,
  isSupabaseAdminConfigured,
} from "@/lib/supabase/admin";
import { DRIVE_UNAVAILABLE, type DriveStatus } from "./status";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const TABLE = "google_drive_connections";

export function isGoogleSignInAvailable() {
  return isSupabaseConfigured() && Boolean(process.env.GOOGLE_CLIENT_ID);
}

export function isDriveAvailable() {
  return (
    isGoogleSignInAvailable() &&
    Boolean(process.env.GOOGLE_CLIENT_SECRET) &&
    isSupabaseAdminConfigured()
  );
}

export async function getDriveStatus(userId: string): Promise<DriveStatus> {
  if (!isDriveAvailable()) return DRIVE_UNAVAILABLE;
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("google_email")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    available: true,
    connected: Boolean(data),
    email: data?.google_email ?? null,
  };
}

export async function saveDriveConnection(
  userId: string,
  { refreshToken, email }: { refreshToken: string; email: string | null },
) {
  const { error } = await createAdminClient().from(TABLE).upsert({
    user_id: userId,
    refresh_token: refreshToken,
    google_email: email,
    updated_at: new Date().toISOString(),
  });
  if (error)
    throw new Error(`Couldn’t save the Drive connection: ${error.message}`);
}

export async function deleteDriveConnection(
  userId: string,
  { revoke }: { revoke: boolean },
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from(TABLE)
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  await admin.from(TABLE).delete().eq("user_id", userId);
  if (revoke && data?.refresh_token)
    await fetch(REVOKE_URL, {
      method: "POST",
      body: new URLSearchParams({ token: data.refresh_token }),
    }).catch(() => {});
}

export async function getDriveAccessToken(
  userId: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  const { data } = await createAdminClient()
    .from(TABLE)
    .select("refresh_token")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (body.error === "invalid_grant") {
    await deleteDriveConnection(userId, { revoke: false });
    return null;
  }
  if (!response.ok || !body.access_token)
    throw new Error(`Google token refresh failed (${response.status}).`);
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 3600 };
}
