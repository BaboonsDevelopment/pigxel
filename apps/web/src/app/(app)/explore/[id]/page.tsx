import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArtPage } from "@/features/explore/components/art-page/art-page";
import {
  getFollowStats,
  getOwnProfile,
  getPublicTile,
} from "@/features/profile/server";
import { isTileSaved } from "@/features/explore/server";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tile = UUID.test(id)
    ? await getPublicTile(id, null).catch(() => null)
    : null;
  return { title: `${tile?.name ?? "Art"} · Pigxel` };
}

export default async function ArtDetailPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const user = await getUser();
  const tile = await getPublicTile(id, user?.id ?? null);
  if (!tile) notFound();
  const [profile, follow, saved] = await Promise.all([
    user ? getOwnProfile(user.id) : null,
    user && user.id !== tile.author.id
      ? getFollowStats(tile.author.id, user.id).catch(() => null)
      : null,
    user ? isTileSaved(user.id, tile.id).catch(() => false) : false,
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
    />
  );
}
