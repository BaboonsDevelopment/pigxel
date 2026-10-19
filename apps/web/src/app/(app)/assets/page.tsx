import type { Metadata } from "next";
import { Notice } from "@pigxel/ui/components/notice";
import { Page } from "@pigxel/ui/components/page";
import { AssetsView } from "@/features/assets/components/assets-view";
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
  listRecentAssets,
} from "@/features/assets/server";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Assets · Pigxel" };
export const dynamic = "force-dynamic";

export default async function Assets({
  searchParams,
}: {
  searchParams: Promise<AssetSearchParams>;
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()]);
  const { tab, filters, asset } = readAssetView(params);
  const [packs, tags, favourites, recent, firstPage, openAsset] =
    await Promise.all([
      listPackCards().catch((error: unknown) => {
        console.error(error);
        return null;
      }),
      listAssetTags(),
      listAssetFavourites(user.id),
      listRecentAssets(user.id).catch(() => []),
      tab === "all"
        ? listAssetPage(user.id, filters, 0).catch(() => null)
        : null,
      findAsset(asset),
    ]);

  return (
    <div className="min-h-full bg-canvas bg-[url(/art/background-effect.png)] bg-top bg-repeat">
      <Page className="max-w-[100rem] px-5 pt-3 pb-12 md:px-8 md:pt-2 xl:px-10">
        <div className="xl:[container-type:inline-size]">
          <div className="xl:w-[min(1840px,max(1290px,calc(100cqw/var(--zoom))))] xl:[--zoom:max(0.8,min(1,tan(atan2(100cqw,1290px))))] xl:[zoom:var(--zoom)]">
            {packs ? (
              <AssetsView
                tab={tab}
                filters={filters}
                packs={packs}
                tags={tags}
                favourites={favourites}
                recent={recent}
                firstPage={firstPage}
                openAsset={openAsset}
              />
            ) : (
              <Notice tone="error" className="mt-8">
                Couldn’t load assets. Refresh the page to try again.
              </Notice>
            )}
          </div>
        </div>
      </Page>
    </div>
  );
}
