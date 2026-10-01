import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landing } from "@/components/landing/landing";

export const metadata: Metadata = {
  title: "Pigxel — Small pixels. Wild imagination.",
  description:
    "A happy little home for pixel art. Draw, animate, and bring your tiny worlds to life in your browser. Try the playful pixel canvas and make a little something.",
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
