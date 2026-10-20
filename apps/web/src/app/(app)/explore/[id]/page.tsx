import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArtPage } from "@/features/explore/components/art-page/art-page";
import { RelatedArts } from "@/features/explore/components/art-page/related-arts";
import {
  getFollowStats,
  getOwnProfile,
  getPublicTile,
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
  const viewerId = user?.id ?? null;
  // Everything that only needs the id loads alongside the art itself.
  const [tile, profile, saved, comments] = await Promise.all([
    getPublicTile(id, viewerId),
    user ? getOwnProfile(user.id) : null,
    user ? isTileSaved(user.id, id).catch(() => false) : false,
    listComments(id).catch((error: unknown) => {
      console.error(error);
      return { comments: [], count: 0 };
    }),
  ]);
  if (!tile) notFound();
  const follow =
    user && user.id !== tile.author.id
      ? await getFollowStats(tile.author.id, user.id).catch(() => null)
      : null;
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
      related={
        <Suspense fallback={null}>
          <RelatedArts tile={tile} viewerId={viewerId} />
        </Suspense>
      }
    />
  );
}
