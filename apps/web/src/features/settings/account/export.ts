import "server-only";
import { strToU8, zipSync, type Zippable } from "fflate";
import { createAdminClient } from "@/lib/supabase/admin";
import { listFiles } from "./user-files";

/** What goes in data.json: table, the column naming the person, columns. */
const TABLES: { name: string; table: string; by: string; columns?: string }[] =
  [
    { name: "profile", table: "profiles", by: "id" },
    { name: "legal_acceptances", table: "legal_acceptances", by: "user_id" },
    { name: "tiles", table: "tiles", by: "user_id" },
    { name: "folders", table: "folders", by: "user_id" },
    { name: "labels", table: "labels", by: "user_id" },
    { name: "collections", table: "collections", by: "user_id" },
    { name: "shared_with_you", table: "tile_members", by: "user_id" },
    { name: "comments", table: "tile_comments", by: "user_id" },
    { name: "likes", table: "tile_likes", by: "user_id" },
    { name: "saved", table: "saved_tiles", by: "user_id" },
    { name: "following", table: "follows", by: "follower_id" },
    { name: "followers", table: "follows", by: "followee_id" },
    { name: "blocked", table: "blocks", by: "blocker_id" },
    { name: "art_reports_made", table: "art_reports", by: "reporter_id" },
    {
      name: "comment_reports_made",
      table: "comment_reports",
      by: "reporter_id",
    },
    {
      name: "profile_reports_made",
      table: "profile_reports",
      by: "reporter_id",
    },
    { name: "notifications", table: "notifications", by: "user_id" },
    { name: "ai_chats", table: "tile_chats", by: "user_id" },
    { name: "ai_usage", table: "ai_usage", by: "user_id" },
    { name: "feedback", table: "feedback", by: "user_id" },
    { name: "feedback_votes", table: "feedback_votes", by: "user_id" },
    { name: "activity_days", table: "tile_activity", by: "user_id" },
    { name: "views", table: "tile_view_people", by: "user_id" },
    { name: "downloads", table: "tile_download_people", by: "user_id" },
    { name: "editor_layout", table: "editor_layouts", by: "user_id" },
    {
      name: "editor_layout_presets",
      table: "editor_layout_presets",
      by: "user_id",
    },
    { name: "subscriptions", table: "subscriptions", by: "user_id" },
    {
      name: "google_drive_connection",
      table: "google_drive_connections",
      by: "user_id",
      // Never the refresh token: it's a credential, not your data.
      columns: "google_email, created_at, updated_at",
    },
  ];

/** A ZIP of everything Pigxel stores about a person, and their tile files. */
export async function exportAccount(user: {
  id: string;
  email?: string;
  created_at: string;
}): Promise<Uint8Array> {
  const admin = createAdminClient();
  const data: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      created_at: user.created_at,
    },
  };
  for (const { name, table, by, columns } of TABLES) {
    const { data: rows, error } = await admin
      .from(table)
      .select(columns ?? "*")
      .eq(by, user.id);
    data[name] = error ? { error: "Couldn’t export this part." } : rows;
  }

  const files: Zippable = {
    "data.json": strToU8(JSON.stringify(data, null, 2)),
    "README.txt": strToU8(
      "Your Pigxel data. data.json holds your account, profile and activity;\n" +
        "tiles/ holds your saved tiles as .pigxel files, which open in Pigxel;\n" +
        "avatars/ holds pictures you uploaded.\n",
    ),
  };
  for (const [bucket, folder] of [
    ["tiles", "tiles"],
    ["avatars", "avatars"],
  ] as const) {
    for (const path of await listFiles(admin, bucket, user.id)) {
      const { data: blob } = await admin.storage.from(bucket).download(path);
      if (blob)
        files[`${folder}/${path.slice(user.id.length + 1)}`] = new Uint8Array(
          await blob.arrayBuffer(),
        );
    }
  }
  return zipSync(files, { level: 6 });
}
