import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ScaledPage } from "@/components/layout/scaled-page";
import { hasPremiumAccess } from "@/features/billing/server";
import { PackView } from "@/features/assets/components/pack-view";
import {
  readAssetView,
  type AssetSearchParams,
} from "@/features/assets/filters";
import {
  findAsset,
  listAssetFavourites,
  listAssetPage,
  listAssetTags,
  listPackCards,
} from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<AssetSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pack = (await listPackCards().catch(() => [])).find((p) => p.id === id);
  return { title: `${pack?.name ?? "Pack"} · Assets · Pigxel` };
}

export default async function AssetPackPage({ params, searchParams }: Props) {
  const [{ id }, query, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);
  const packs = await listPackCards();
  const pack = packs.find((p) => p.id === id);
  if (!pack) notFound();
  const { filters, asset } = readAssetView(query);
  const scoped = { ...filters, pack: pack.id };
  const [tags, favourites, firstPage, openAsset, premiumAccess] =
    await Promise.all([
      listAssetTags(),
      listAssetFavourites(user.id),
      listAssetPage(user.id, scoped, 0).catch(() => null),
      findAsset(asset),
      hasPremiumAccess(user).catch(() => false),
    ]);

  return (
    <ScaledPage>
      <PackView
        pack={pack}
        packs={packs}
        tags={tags}
        favourites={favourites}
        filters={scoped}
        firstPage={firstPage}
        openAsset={openAsset?.packId === pack.id ? openAsset : null}
        premiumAccess={premiumAccess}
      />
    </ScaledPage>
  );
}
