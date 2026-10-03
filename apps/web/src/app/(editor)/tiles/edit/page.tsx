import type { Metadata } from "next";
import { TileEditor } from "@/features/editor/tile-editor";
import { isAdmin, requireUser } from "@/lib/auth/session";
import { getDriveStatus } from "@/lib/google-drive/server";

export const metadata: Metadata = { title: "Edit tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function EditTile({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; drive?: string; guide?: string }>;
}) {
  const user = await requireUser();
  const [{ id, drive: driveResult, guide }, drive] = await Promise.all([
    searchParams,
    getDriveStatus(user.id),
  ]);
  return (
    <TileEditor
      userId={user.id}
      tileId={id}
      drive={drive}
      driveError={driveResult === "error"}
      guide={guide}
      canPublish={isAdmin(user)}
    />
  );
}
