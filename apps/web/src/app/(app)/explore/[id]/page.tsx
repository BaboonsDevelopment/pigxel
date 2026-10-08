import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtPage } from "@/features/explore/components/art-page/art-page";
import {
  getFollowStats,
  getOwnProfile,
  getPublicTile,
  listMoreByAuthor,
} from "@/features/profile/server";
import { isTileSaved, listComments } from "@/features/explore/server";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tile = UUID.test(id)
    ? await getPublicTile(id, null).catch(() => null)
    : null;
  if (!tile) return { title: "Art · Pigxel" };
  const title = `${tile.name} by @${tile.author.username} · Pigxel`;
  const description =
    tile.description?.trim().slice(0, 200) ||
    `Pixel art by ${tile.author.name} on Pigxel. Open it, remix it and make your own.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "article", siteName: "Pigxel" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function ArtDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await getUser();
  const tile = await getPublicTile(id, user?.id ?? null);
  if (!tile) notFound();
  const [profile, follow, saved, comments, moreArts] = await Promise.all([
    user ? getOwnProfile(user.id) : null,
    user && user.id !== tile.author.id
      ? getFollowStats(tile.author.id, user.id).catch(() => null)
      : null,
    user ? isTileSaved(user.id, tile.id).catch(() => false) : false,
    listComments(tile.id).catch((error: unknown) => {
      console.error(error);
      return { comments: [], count: 0 };
    }),
    listMoreByAuthor(tile.author.id, tile.id).catch(() => []),
  ]);
  return (
    <ArtPage
      tile={tile}
      viewer={
        user
          ? {
              id: user.id,
              name: profile?.name ?? user.email ?? "You",
              avatarUrl: profile?.avatarUrl ?? null,
            }
          : null
      }
      following={follow?.following ?? false}
      saved={saved}
      comments={comments}
      moreArts={moreArts}
    />
  );
}
