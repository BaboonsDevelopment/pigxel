import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/features/landing/components/landing";

export const metadata: Metadata = {
  title: "Pigxel Studio",
  description:
    "Pigxel Studio is a pixel art editor that runs in your browser. Draw and animate pixel art, then sign in with Google to save your projects to Pigxel cloud or your own Google Drive.",
  alternates: { canonical: "https://www.pigxel.studio/" },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string;
    error?: string;
    type?: string;
    sb_flow_id?: string;
  }>;
}) {
  const params = await searchParams;
  if (params.code) {
    const query = new URLSearchParams({ code: params.code });
    if (params.sb_flow_id) query.set("sb_flow_id", params.sb_flow_id);
    if (params.type === "recovery") query.set("next", "/auth/update-password");
    redirect(`/auth/callback?${query}`);
  }
  if (params.error) redirect("/login?error=confirmation");
  return <Landing />;
}
