import { redirect } from "next/navigation";
import { ArtistHome } from "@/components/artist-home/artist-home";

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
  return <ArtistHome />;
}
