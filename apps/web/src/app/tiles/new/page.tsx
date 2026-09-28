import type { Metadata } from "next";
import { ChatPanel } from "@/components/chat-panel/chat-panel";
import { PixelCanvas } from "@/components/pixel-canvas/pixel-canvas";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New tile · Pigxel" };
export const dynamic = "force-dynamic";

export default async function NewTile() {
  await requireUser();
  return (
    <div className="grid h-dvh grid-cols-[minmax(0,1fr)_340px]">
      <main className="flex overflow-auto bg-muted p-12">
        <div className="m-auto">
          <PixelCanvas />
        </div>
      </main>
      <ChatPanel />
    </div>
  );
}
