import type { Metadata } from "next";
import { PixelCanvas } from "@/components/pixel-canvas/pixel-canvas";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile() {
  await requireUser();
  return (
    <main className="flex h-dvh overflow-auto bg-muted p-12">
      <div className="m-auto">
        <PixelCanvas />
      </div>
    </main>
  );
}
