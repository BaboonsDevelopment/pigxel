"use client";

import Link from "next/link";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import { manrope } from "@/lib/fonts/manrope";
import { PremiumCrown } from "@/features/billing/components/premium-crown";
import { PinBadge } from "@/features/tiles/components/projects-view/components/project-grid/badges";
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
  premiumAccess,
}: {
  pack: Pack;
  tint: string;
  favourite: boolean;
  onFavourite: (on: boolean) => void;
  /** Can use premium packs: its crown glows, or is greyed out. */
  premiumAccess: boolean;
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
          {pack.pinnedAt && (
            <span className="absolute top-2 left-2">
              <PinBadge />
            </span>
          )}
          {pack.premium && (
            <PremiumCrown
              locked={!premiumAccess}
              className="absolute right-2.5 bottom-2.5"
            />
          )}
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
            className="mt-1.5 flex items-center gap-x-2 text-xs leading-5 text-[#806775] tabular-nums"
          >
            <LayersIcon />
            {pack.count} {pack.count === 1 ? "asset" : "assets"}
            {pack.size && (
              <>
                <SizeIcon />
                {pack.size}
              </>
            )}
          </Text>
          <span className="flex items-center gap-2 text-xs leading-5 text-[#806775] tabular-nums">
            <MotionIcon />
            {motionText(pack.animated, pack.count - pack.animated)}
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

/** "12 animated · 12 static", or only the kind the pack has. */
const motionText = (animated: number, still: number) =>
  [animated > 0 && `${animated} animated`, still > 0 && `${still} static`]
    .filter(Boolean)
    .join(" · ");

const ICON = "size-4 shrink-0 text-[#4a2434]";

function LayersIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

/** A frame's corners: the canvas size. */
function SizeIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(ICON, "ml-2")}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  );
}

/** A square with speed lines trailing it: something that moves. */
function MotionIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON}
    >
      <rect x="12" y="7" width="10" height="10" rx="2" />
      <path d="M5 9h4M2 12h7M5 15h4" />
    </svg>
  );
}
