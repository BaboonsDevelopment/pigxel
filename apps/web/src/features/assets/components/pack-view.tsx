"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { SectionHeader, Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { madimiOne } from "@/lib/fonts/madimi";
import { PremiumBadge } from "@/features/billing/components/premium-badge";
import { UpgradeDialog } from "@/features/billing/components/upgrade-dialog";
import { loadPackAssets } from "../actions";
import type { Asset } from "../assets";
import { assetTint } from "../constants";
import {
  assetViewUrl,
  NO_ASSET_FILTERS,
  packViewUrl,
  relatedPacks,
  type AssetFilters,
} from "../filters";
import { downloadPackZip } from "../pack-zip";
import type { AssetTag, PackCard as Pack } from "../server";
import {
  ASSET_GRID,
  AssetResults,
  AssetToolbar,
  useAssetFilters,
  useFavourites,
  type AssetPage,
} from "./asset-browser";
import { AssetDialog } from "./asset-dialog";
import { AssetImage } from "./asset-image";
import { FavouriteButton } from "./favourite-button";
import { PackCard } from "./pack-card";

export function PackView({
  pack,
  packs,
  tags,
  favourites: initialFavourites,
  filters: initialFilters,
  firstPage,
  openAsset,
  premiumAccess,
}: {
  pack: Pack;
  /** Every pack, for colours and "More packs like this". */
  packs: Pack[];
  tags: AssetTag[];
  favourites: { assets: string[]; packs: string[] };
  filters: AssetFilters;
  firstPage: AssetPage | null;
  openAsset: Asset | null;
  /** Can open premium files: a paid plan, or an admin. */
  premiumAccess: boolean;
}) {
  const router = useRouter();
  const { filters, typed, setTyped, setFilters } = useAssetFilters({
    ...initialFilters,
    pack: pack.id,
  });
  const [open, setOpen] = useState<Asset | null>(openAsset);
  const favourites = useFavourites(initialFavourites);
  const [zipping, setZipping] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [status, setStatus] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);

  const packById = useMemo(
    () => new Map(packs.map((p, index) => [p.id, { pack: p, index }])),
    [packs],
  );
  const tagNames = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );
  const tint = pack.background
    ? ""
    : assetTint(packById.get(pack.id)?.index ?? 0);
  const related = useMemo(() => relatedPacks(pack, packs), [pack, packs]);
  const locked = pack.premium && !premiumAccess;

  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      packViewUrl(pack.id, filters, open?.id ?? null),
    );
  }, [pack.id, filters, open]);

  const zip = async () => {
    if (locked) return setUpgrading(true);
    setZipping(true);
    setStatus({ text: `Packing ${pack.count} assets…` });
    try {
      await downloadPackZip(pack.id, await loadPackAssets(pack.id));
      setStatus({ text: `Downloaded ${pack.id}.zip.` });
    } catch {
      setStatus({ error: true, text: "Couldn’t make the ZIP. Try again." });
    } finally {
      setZipping(false);
    }
  };

  const copyId = () =>
    navigator.clipboard?.writeText(pack.id).then(
      () => setStatus({ text: `Copied the id “${pack.id}”.` }),
      () => setStatus({ error: true, text: "Couldn’t copy the id." }),
    );

  const tagUrl = (tag: string) =>
    assetViewUrl("all", { ...NO_ASSET_FILTERS, tags: [tag] });

  return (
    <div>
      <nav
        aria-label="Breadcrumb"
        className="mb-4 text-sm text-muted-foreground"
      >
        <Link href="/assets" className="hover:text-foreground hover:underline">
          Assets
        </Link>{" "}
        <span aria-hidden="true">/</span> {pack.name}
      </nav>

      <header className="mb-10 grid gap-6 border-b border-[#f0dde5] pb-8 sm:grid-cols-[16rem_minmax(0,1fr)]">
        <div
          className={cn(
            "relative grid aspect-square grid-cols-2 grid-rows-2 gap-2 rounded-3xl p-4",
            tint,
          )}
          style={pack.background ? { background: pack.background } : undefined}
        >
          {pack.previews.map((asset) => (
            <span
              key={asset.id}
              className="flex items-center justify-center rounded-2xl bg-white/45"
            >
              <AssetImage
                asset={asset}
                repeat={asset.kind === "tile"}
                className={asset.kind === "tile" ? "w-full" : "w-2/3"}
              />
            </span>
          ))}
          {pack.premium && <PremiumBadge className="absolute top-3 left-3" />}
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex items-start gap-3">
            <h1
              className={cn(
                madimiOne.className,
                "min-w-0 text-[40px] leading-[48px] tracking-[0.02em] text-[#4a2434]",
              )}
            >
              {pack.name}
            </h1>
            <FavouriteButton
              on={favourites.packs.has(pack.id)}
              label={pack.name}
              onChange={(on) => favourites.pack(pack.id, on)}
              className="mt-2 shrink-0"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Text size="sm" tone="muted" className="tabular-nums">
              {pack.count} {pack.count === 1 ? "asset" : "assets"}
              {pack.animated > 0 && ` · ${pack.animated} animated`}
            </Text>
            {pack.size && (
              <Badge tone="muted" className="tabular-nums">
                {pack.size}
              </Badge>
            )}
            <button
              type="button"
              onClick={() => void copyId()}
              title="Copy the id"
              className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground hover:text-foreground"
            >
              {pack.id}
            </button>
          </div>
          {pack.description && (
            <Text className="max-w-prose">{pack.description}</Text>
          )}
          {pack.tags.length > 0 && (
            <ul aria-label="Tags" className="flex flex-wrap gap-1.5">
              {pack.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={tagUrl(tag)}
                    className="block rounded-full border px-2.5 py-0.5 text-xs hover:bg-muted"
                  >
                    {tagNames.get(tag) ?? tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
            <Button type="button" onClick={() => void zip()} disabled={zipping}>
              {zipping ? "Packing…" : "Download pack (ZIP)"}
            </Button>
            {status && (
              <Text
                role="status"
                size="xs"
                tone={status.error ? "error" : "muted"}
              >
                {status.text}
              </Text>
            )}
          </div>
        </div>
      </header>

      {favourites.error && (
        <FormMessage tone="error" className="mb-4">
          {favourites.error}
        </FormMessage>
      )}

      <div className="mb-6">
        <AssetToolbar
          typed={typed}
          onTyped={setTyped}
          placeholder={`Search ${pack.name}…`}
          filters={filters}
          onFilters={(next) => setFilters({ ...next, pack: pack.id })}
          tags={tags.filter((tag) => pack.tags.includes(tag.id))}
          packs={[]}
          pack={false}
        />
      </div>

      <AssetResults
        title="In this pack"
        filters={filters}
        firstPage={firstPage}
        packs={packById}
        favourites={favourites.assets}
        onFavourite={favourites.asset}
        onOpen={setOpen}
      />

      {related.length > 0 && (
        <section aria-labelledby="packs-related" className="mt-14">
          <SectionHeader id="packs-related" title="More packs like this" />
          <ul className={ASSET_GRID}>
            {related.map((other) => (
              <li key={other.id}>
                <PackCard
                  pack={other}
                  tint={
                    other.background
                      ? ""
                      : assetTint(packById.get(other.id)?.index ?? 0)
                  }
                  favourite={favourites.packs.has(other.id)}
                  onFavourite={(on) => favourites.pack(other.id, on)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <AssetDialog
          asset={open}
          pack={pack}
          tagNames={tagNames}
          favourite={favourites.assets.has(open.id)}
          onFavourite={(on) => favourites.asset(open.id, on)}
          onPack={(packId) =>
            packId === pack.id
              ? setOpen(null)
              : router.push(packViewUrl(packId))
          }
          onTag={(tag) => router.push(tagUrl(tag))}
          onClose={() => setOpen(null)}
        />
      )}

      {upgrading && (
        <UpgradeDialog
          title="Premium pack"
          description={`“${pack.name}” comes with the paid plans. Upgrade to download it and use its assets.`}
          onClose={() => setUpgrading(false)}
        />
      )}
    </div>
  );
}
