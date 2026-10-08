import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CollectionView } from "@/features/collections/components/collection-view";
import { getCollection } from "@/features/collections/server";
import { listPublicTilesByIds } from "@/features/profile/server";
import { getUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const found = UUID.test(id)
    ? await getCollection(id).catch(() => null)
    : null;
  if (!found) return { title: "Collection · Pigxel" };
  const { collection } = found;
  const title = `${collection.name} by @${collection.author.username} · Pigxel`;
  const description =
    collection.description.slice(0, 200) ||
    `A collection of pixel arts by ${collection.author.name} on Pigxel.`;
  return {
    title,
    description,
    openGraph: { title, description, siteName: "Pigxel" },
    twitter: { card: "summary", title, description },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [user, found] = await Promise.all([getUser(), getCollection(id)]);
  if (!found) notFound();
  const tiles = await listPublicTilesByIds(found.tileIds, user?.id ?? null);
  return (
    <CollectionView
      collection={found.collection}
      tiles={tiles}
      isOwner={user?.id === found.collection.author.id}
    />
  );
}
