import type { Metadata } from "next";
import { TileEditor } from "@/features/editor/tile-editor";
import { WideScreenOnly } from "@/features/editor/components/wide-screen-only";
import { isAdmin, requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function EditTile({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    guide?: string;
    start?: string;
  }>;
}) {
  const user = await requireUser();
  const { id, guide, start } = await searchParams;
  return (
    <WideScreenOnly>
      <TileEditor
        userId={user.id}
        tileId={id}
        guide={guide}
        start={start}
        canPublish={isAdmin(user)}
      />
    </WideScreenOnly>
  );
}
