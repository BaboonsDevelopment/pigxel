"use client";

import Link from "next/link";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { manrope } from "@/lib/fonts/manrope";
import { PremiumBadge } from "@/features/billing/components/premium-badge";
import { packViewUrl } from "../filters";
import type { PackCard as Pack } from "../server";
import { AssetImage } from "./asset-image";
import { FavouriteButton } from "./favourite-button";

/** A pack as a 2×2 collage of its sprites, so it reads as a bundle. */
export function PackCard({
  pack,
  tint,
  favourite,
  onFavourite,
}: {
  pack: Pack;
  tint: string;
  favourite: boolean;
  onFavourite: (on: boolean) => void;
}) {
  return (
    <div className={cn(manrope.className, "group relative text-[#4a1f35]")}>
      <Link
        href={packViewUrl(pack.id)}
        className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          className={cn(
            "relative grid aspect-square grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-[14px] p-2.5 transition group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none",
            tint,
          )}
          style={pack.background ? { background: pack.background } : undefined}
        >
          {pack.previews.map((asset) => (
            <span
              key={asset.id}
              className="flex items-center justify-center overflow-hidden"
            >
              <AssetImage
                asset={asset}
                repeat={asset.kind === "tile"}
                className={cn(
                  "transition-transform duration-300 ease-out motion-reduce:transition-none",
                  asset.kind === "tile"
                    ? "w-full"
                    : "w-[88%] group-hover:scale-105",
                )}
              />
            </span>
          ))}
          {pack.premium && <PremiumBadge className="absolute top-2 left-2" />}
        </span>
        <span className="mt-3 block px-1">
          <span
            title={pack.name}
            className="line-clamp-2 min-h-11 text-[15px] leading-[22px] font-semibold text-[#4a2434] [overflow-wrap:anywhere]"
          >
            {pack.name}
          </span>
          <Text
            as="span"
            size="xs"
            tone="muted"
            className="mt-1 block text-xs leading-5 text-[#806775] tabular-nums"
          >
            {pack.count} {pack.count === 1 ? "asset" : "assets"}
            {pack.size && ` · ${pack.size}`}
          </Text>
          <span className="block text-xs leading-5 text-[#806775]">
            {pack.animated > 0 ? `${pack.animated} animated` : "Static assets"}
          </span>
        </span>
      </Link>
      <FavouriteButton
        on={favourite}
        label={pack.name}
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
