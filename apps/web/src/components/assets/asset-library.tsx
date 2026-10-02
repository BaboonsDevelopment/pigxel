"use client";

import { useState } from "react";
import { cn } from "@pigxel/ui/lib/utils";
import {
  ASSET_CATEGORIES,
  ASSETS,
  assetSize,
  type Asset,
  type AssetCategory,
} from "@/lib/assets/assets";
import { AssetDialog } from "./asset-dialog";
import { AssetSprite } from "./asset-sprite";

/** The pastel behind each kind of asset, as on Home's cards. */
const TINTS: Record<AssetCategory, string> = {
  characters: "bg-[#f8dde6]",
  items: "bg-[#f9e0d6]",
  nature: "bg-[#dfeae4]",
  tiles: "bg-[#e6e2f5]",
};

/** The sprites and tiles, a section per kind; a click opens one up close. */
export function AssetLibrary({ only }: { only?: AssetCategory }) {
  const [open, setOpen] = useState<Asset | null>(null);
  const categories = ASSET_CATEGORIES.filter((c) => !only || c.id === only);

  return (
    <>
      {categories.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`assets-${category.id}`}
          className="mt-8"
        >
          <h2
            id={`assets-${category.id}`}
            className="mb-3 font-display text-xl tracking-tight"
          >
            {category.label}
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {ASSETS.filter((asset) => asset.category === category.id).map(
              (asset) => (
                <li key={asset.id}>
                  <AssetCard asset={asset} onOpen={() => setOpen(asset)} />
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
      {open && <AssetDialog asset={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function AssetCard({ asset, onOpen }: { asset: Asset; onOpen: () => void }) {
  const { w, h } = assetSize(asset);
  const frames = asset.frames.length;
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
        {asset.category === "tiles" ? (
          // A tile next to copies of itself, to show it repeats without seams.
          <AssetSprite
            asset={asset}
            repeat={3}
            className="size-full transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <AssetSprite
            asset={asset}
            className="size-3/5 transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:-rotate-3 motion-reduce:transition-none"
          />
        )}
        {frames > 1 && (
          <span className="absolute top-2 right-2 rounded-full bg-white/85 px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
            Animated
          </span>
        )}
      </span>
      <span className="mt-2 block truncate text-sm font-semibold">
        {asset.name}
      </span>
      <span className="block font-mono text-xs text-muted-foreground tabular-nums">
        {w} × {h}
        {frames > 1 && ` · ${frames} frames`}
      </span>
    </button>
  );
}
