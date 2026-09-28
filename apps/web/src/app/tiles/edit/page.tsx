import type { Metadata } from "next";
import { TileEditor } from "@/components/tile-editor/tile-editor";
import { requireUser } from "@/lib/auth/session";
import { getDriveStatus } from "@/lib/google-drive/server";

export const metadata: Metadata = { title: "Edit tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function EditTile({
  searchParams,
}: {
  searchParams: Promise<{ drive?: string }>;
}) {
  const user = await requireUser();
  const [{ drive: driveResult }, drive] = await Promise.all([
    searchParams,
    getDriveStatus(user.id),
  ]);
  return (
    <TileEditor
      userId={user.id}
      drive={drive}
      driveError={driveResult === "error"}
    />
  );
}
