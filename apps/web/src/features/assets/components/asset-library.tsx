"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@pigxel/ui/components/badge";
import {
  linkVariants,
  SectionHeader,
  Text,
} from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { isLocked, type Asset, type AssetBlock } from "../assets";
import { assetTint } from "../constants";
import { AssetDialog } from "./asset-dialog";
import { AssetImage } from "./asset-image";

export type AssetSection = {
  category: AssetBlock;
  index: number;
  assets: Asset[];
  total: number;
  /** Link to the next batch, on a category's own page. */
  more?: string;
};

export function AssetLibrary({
  sections,
  canManage,
}: {
  sections: AssetSection[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState<{
    asset: Asset;
    block: string;
  } | null>(null);

  return (
    <>
      {sections.map(({ category, index, assets, total, more }) =>
        assets.length === 0 ? null : (
          <section
            key={category.id}
            aria-labelledby={`assets-${category.id}`}
            className="mt-8"
          >
            <SectionHeader
              id={`assets-${category.id}`}
              title={category.name}
              actions={
                total > assets.length && (
                  <Link
                    href={`/assets?type=${category.id}`}
                    className={linkVariants({ variant: "accent" })}
                  >
                    See all {total} <span aria-hidden="true">→</span>
                  </Link>
                )
              }
            />
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {assets.map((asset) => (
                <li key={asset.id}>
                  <AssetCard
                    asset={asset}
                    tint={assetTint(index)}
                    onOpen={() => setOpen({ asset, block: category.name })}
                  />
                </li>
              ))}
            </ul>
            {more && (
              <p className="mt-6 text-center">
                <Link
                  href={more}
                  scroll={false}
                  className={linkVariants({ variant: "accent" })}
                >
                  Show more ({assets.length} of {total})
                </Link>
              </p>
            )}
          </section>
        ),
      )}
      {open && (
        <AssetDialog
          key={open.asset.id}
          asset={open.asset}
          blockName={open.block}
          canRemove={canManage}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function AssetCard({
  asset,
  tint,
  onOpen,
}: {
  asset: Asset;
  tint: string;
  onOpen: () => void;
}) {
  const tile = asset.kind === "tile";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl transition group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none",
          tint,
        )}
      >
        <AssetImage
          asset={asset}
          repeat={tile}
          className={cn(
            "transition-transform duration-300 ease-out motion-reduce:transition-none",
            tile
              ? "w-full group-hover:scale-105"
              : "w-3/5 group-hover:-translate-y-1 group-hover:-rotate-3",
          )}
        />
        {asset.premium && (
          <Badge
            tone="primary"
            className="absolute top-2 left-2"
            title={isLocked(asset) ? "Included in paid plans" : undefined}
          >
            Premium
          </Badge>
        )}
        {asset.frames > 1 && (
          <Badge tone="overlay" className="absolute top-2 right-2">
            Animated
          </Badge>
        )}
      </span>
      <span className="mt-2 block truncate text-sm font-semibold">
        {asset.name}
      </span>
      <Text
        as="span"
        size="xs"
        tone="muted"
        className="block font-mono tabular-nums"
      >
        {asset.width} × {asset.height}
        {asset.frames > 1 && ` · ${asset.frames} frames`}
      </Text>
    </button>
  );
}
