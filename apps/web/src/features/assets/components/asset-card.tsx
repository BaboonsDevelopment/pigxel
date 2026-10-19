"use client";

import { Badge } from "@pigxel/ui/components/badge";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { manrope } from "@/lib/fonts/manrope";
import { PremiumBadge } from "@/features/billing/components/premium-badge";
import { TilesBadge } from "@/features/tiles/components/tiles-badge";
import type { Asset } from "../assets";
import { AssetImage } from "./asset-image";
import { FavouriteButton } from "./favourite-button";

export function AssetCard({
  asset,
  premium,
  tint,
  background,
  favourite,
  onFavourite,
  onOpen,
}: {
  asset: Asset;
  /** Its pack is premium. */
  premium: boolean;
  tint: string;
  background: string | null;
  favourite: boolean;
  onFavourite: (on: boolean) => void;
  onOpen: () => void;
}) {
  const tile = asset.kind === "tile";
  return (
    <div className={cn(manrope.className, "group relative text-[#4a1f35]")}>
      <button
        type="button"
        onClick={onOpen}
        className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          className={cn(
            "relative flex aspect-square items-center justify-center overflow-hidden rounded-[14px] transition group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none",
            tint,
          )}
          style={background ? { background } : undefined}
        >
          <AssetImage
            asset={asset}
            repeat={tile}
            className={cn(
              "transition-transform duration-300 ease-out motion-reduce:transition-none",
              tile
                ? "w-full group-hover:scale-105"
                : "w-[78%] group-hover:scale-105",
            )}
          />
          {premium && <PremiumBadge className="absolute top-2 left-2" />}
          {asset.frames > 1 && (
            <Badge tone="overlay" className="absolute bottom-2 right-2">
              Animated
            </Badge>
          )}
          {tile && <TilesBadge className="absolute bottom-2 left-2" />}
        </span>
        <span className="mt-3 block px-1">
          <span
            title={asset.name}
            className="line-clamp-2 min-h-11 text-[15px] leading-[22px] font-semibold text-[#4a2434] [overflow-wrap:anywhere]"
          >
            {asset.name}
          </span>
          <Text
            as="span"
            size="xs"
            tone="muted"
            className="mt-1 block text-xs leading-5 text-[#806775] tabular-nums"
          >
            {asset.width}×{asset.height}
            {asset.frames > 1 && ` · ${asset.frames} frames`}
          </Text>
          <span className="block text-xs leading-5 text-[#806775]">
            {tile
              ? "Seamless tile"
              : asset.frames > 1
                ? "Animated sprite"
                : "Static sprite"}
          </span>
        </span>
      </button>
      <FavouriteButton
        on={favourite}
        label={asset.name}
        onChange={onFavourite}
        className={cn(
          "absolute top-2 right-2",
          !favourite &&
            "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100",
        )}
      />
    </div>
  );
}
