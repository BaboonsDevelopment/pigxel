"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import type { Asset, AssetCategory } from "@/lib/assets/assets";
import { AssetDialog } from "./asset-dialog";
import { AssetImage } from "./asset-image";

const TINTS: Record<AssetCategory, string> = {
  characters: "bg-[#f8dde6]",
  items: "bg-[#f9e0d6]",
  nature: "bg-[#dfeae4]",
  tiles: "bg-[#e6e2f5]",
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
            <div className="mb-3 flex items-end justify-between gap-4">
              <h2
                id={`assets-${category.id}`}
                className="font-display text-xl tracking-tight"
              >
                {category.label}
              </h2>
              {total > assets.length && (
                <Link
                  href={`/assets?type=${category.id}`}
                  className="text-xs font-medium text-[#9a78d0] hover:underline"
                >
                  See all {total} <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
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
          <span className="absolute top-2 right-2 rounded-full bg-white/85 px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
            Animated
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-sm font-semibold">
        {asset.name}
      </span>
      <span className="block font-mono text-xs text-muted-foreground tabular-nums">
        {asset.width} × {asset.height}
        {asset.frames > 1 && ` · ${asset.frames} frames`}
      </span>
    </button>
  );
}
