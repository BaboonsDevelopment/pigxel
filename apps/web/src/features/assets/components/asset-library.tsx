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
import type { Asset, AssetCategory } from "@/lib/assets/assets";
import { AssetDialog } from "./asset-dialog";
import { AssetImage } from "./asset-image";

const TINTS: Record<AssetCategory, string> = {
  characters: "bg-pastel-pink",
  items: "bg-pastel-peach",
  nature: "bg-pastel-mint",
  tiles: "bg-pastel-lavender",
};

export type AssetSection = {
  category: { id: AssetCategory; label: string };
  assets: Asset[];
  total: number;
};

export function AssetLibrary({
  sections,
  canManage,
}: {
  sections: AssetSection[];
  canManage: boolean;
}) {
  const [open, setOpen] = useState<Asset | null>(null);

  return (
    <>
      {sections.map(({ category, assets, total }) =>
        assets.length === 0 ? null : (
          <section
            key={category.id}
            aria-labelledby={`assets-${category.id}`}
            className="mt-8"
          >
            <SectionHeader
              id={`assets-${category.id}`}
              title={category.label}
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
                  <AssetCard asset={asset} onOpen={() => setOpen(asset)} />
                </li>
              ))}
            </ul>
          </section>
        ),
      )}
      {open && (
        <AssetDialog
          key={open.id}
          asset={open}
          canRemove={canManage}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function AssetCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const tile = asset.category === "tiles";
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span
        className={cn(
          "relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl transition group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none",
          TINTS[asset.category],
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
