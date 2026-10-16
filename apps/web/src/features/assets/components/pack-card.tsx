"use client";

import Link from "next/link";
import { Badge } from "@pigxel/ui/components/badge";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
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
    <div className="group relative">
      <Link
        href={packViewUrl(pack.id)}
        className="block w-full rounded-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span
          className={cn(
            "relative grid aspect-square grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl p-3 transition group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none",
            tint,
          )}
          style={pack.background ? { background: pack.background } : undefined}
        >
          {pack.previews.map((asset) => (
            <span
              key={asset.id}
              className="flex items-center justify-center rounded-xl bg-white/45"
            >
              <AssetImage
                asset={asset}
                repeat={asset.kind === "tile"}
                className={cn(
                  "transition-transform duration-300 ease-out motion-reduce:transition-none",
                  asset.kind === "tile"
                    ? "w-full"
                    : "w-2/3 group-hover:-rotate-3",
                )}
              />
            </span>
          ))}
          {pack.premium && <PremiumBadge className="absolute top-2 left-2" />}
        </span>
        <span className="mt-2 flex items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold">
            {pack.name}
          </span>
          {pack.size && (
            <Badge tone="muted" className="shrink-0 tabular-nums">
              {pack.size}
            </Badge>
          )}
        </span>
        <Text as="span" size="xs" tone="muted" className="block tabular-nums">
          {pack.count} {pack.count === 1 ? "asset" : "assets"}
          {pack.animated > 0 && ` · ${pack.animated} animated`}
        </Text>
      </Link>
      <FavouriteButton
        on={favourite}
        label={pack.name}
        onChange={onFavourite}
        className={cn(
          "absolute top-2 right-2",
          !favourite &&
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
        )}
      />
    </div>
  );
}
