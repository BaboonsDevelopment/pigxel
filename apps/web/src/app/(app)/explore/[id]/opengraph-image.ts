import { getPublicTile } from "@/features/profile/server";
import { SHARE_SIZE, shareImage } from "@/features/explore/share-image";
import { parsePigxel } from "@/lib/pigxel-file/format";
import { createClient } from "@/lib/supabase/server";

export const size = SHARE_SIZE;
export const contentType = "image/png";
export const alt = "Pixel art on Pigxel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tile = UUID.test(id)
    ? await getPublicTile(id, null).catch(() => null)
    : null;
  if (!tile) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("tiles")
    .download(`${tile.author.id}/${tile.id}.pigxel`);
  if (error) return new Response("Not found", { status: 404 });
  const png = shareImage(parsePigxel(await data.text()));
  return new Response(png, {
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600",
    },
  });
}
