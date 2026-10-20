"use client";

import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import type { PublicTile } from "@/features/profile/profile";
import { madimiOne } from "@/lib/fonts/madimi";
import { rememberArt } from "../../../art-cache";
import { formatCount } from "../../popular-card/helpers";

export function ArtStrip({
  title,
  arts,
  viewAll,
}: {
  title: string;
  arts: PublicTile[];
  viewAll?: string;
}) {
  return (
    <section aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2
          className={cn(
            madimiOne.className,
            "text-2xl tracking-[0.02em] text-[#4a1f35]",
          )}
        >
          {title}
        </h2>
        {viewAll && (
          <Link
            href={viewAll}
            className="shrink-0 text-sm font-medium text-accent-pink hover:underline"
          >
            View all →
          </Link>
        )}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {arts.map((art) => (
          <li key={art.id}>
            <Link
              href={`/explore/${art.id}`}
              onClick={() => rememberArt(art)}
              className="group block overflow-hidden rounded-xl border bg-background transition-shadow hover:shadow-[0_6px_16px_-8px_rgb(59_42_51/0.35)]"
            >
              <span className="block aspect-[4/3] overflow-hidden bg-checker">
                {art.thumbnail && (
                  <PixelImage
                    src={art.thumbnail}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none"
                  />
                )}
              </span>
              <span className="block px-3 py-2.5">
                <span className="block truncate text-sm text-[#4a1f35]">
                  {art.name}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  @{art.author.username} · ♡ {formatCount(art.likes)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
