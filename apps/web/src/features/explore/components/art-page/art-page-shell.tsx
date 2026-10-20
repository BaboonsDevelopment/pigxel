"use client";

import { useParams } from "next/navigation";
import { Skeleton } from "@pigxel/ui/components/skeleton";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { madimiOne } from "@/lib/fonts/madimi";
import { manrope } from "@/lib/fonts/manrope";
import { recallArt } from "../../art-cache";
import {
  CommentsIcon,
  LikesIcon,
  RemixIcon,
  Stat,
  ViewsIcon,
} from "./components/art-details";
import { Breadcrumb } from "./components/breadcrumb";

const published = new Intl.DateTimeFormat("en", { dateStyle: "long" });

/**
 * The art page while the server loads it. Same layout and sizes as ArtPage,
 * so nothing moves when it arrives: filled with what the clicked card knew
 * (title, artist, counts, thumbnail), placeholders for the rest, and
 * placeholders throughout when the page was opened directly.
 */
export function ArtPageShell() {
  const { id } = useParams<{ id: string }>();
  const tile = recallArt(id);
  const count = (value: number | undefined) => (tile ? (value ?? 0) : null);

  return (
    <div aria-busy="true" className={cn(manrope.className, "text-[#4a1f35]")}>
      <Breadcrumb>
        <span className="ml-auto flex shrink-0 items-center gap-1.5 pl-3">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </span>
      </Breadcrumb>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-6 gap-y-8 lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)] lg:grid-rows-[auto_1fr]">
        <div className="flex flex-col gap-3">
          <section
            aria-label="Art preview"
            className="relative rounded-2xl bg-[#f6e3eb] p-3"
          >
            <div className="flex aspect-[4/3] w-full overflow-hidden rounded-xl bg-checker">
              {tile?.thumbnail ? (
                <PixelImage
                  src={tile.thumbnail}
                  alt=""
                  className="m-auto size-full object-contain"
                />
              ) : (
                <Skeleton className="size-full rounded-none opacity-60" />
              )}
            </div>
          </section>
          <div className="flex items-center gap-4">
            <span className="ml-auto shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {tile ? (
                `${tile.width} × ${tile.height} px · Pixel art`
              ) : (
                <Skeleton className="h-3.5 w-28" />
              )}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section className="flex flex-col">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                {tile ? (
                  <>
                    <ProfileAvatar
                      name={tile.author.name}
                      url={tile.author.avatarUrl}
                      className="size-12 bg-pastel-pink-soft text-lg text-primary"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-semibold">
                        {tile.author.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {tile.author.bio?.trim() || `@${tile.author.username}`}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <Skeleton className="size-12 shrink-0 rounded-full" />
                    <span className="grid gap-1.5">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </span>
                  </>
                )}
              </span>
              <Skeleton className="h-10 w-[106px] shrink-0 rounded-xl" />
              <Skeleton className="h-7 w-8 shrink-0 rounded-md" />
            </div>

            {tile ? (
              <h1
                className={cn(
                  madimiOne.className,
                  "mt-5 text-[40px] leading-[1.1] tracking-[0.02em] break-words",
                )}
              >
                {tile.name}
              </h1>
            ) : (
              <Skeleton className="mt-5 h-11 w-2/3" />
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              {tile?.publishedAt ? (
                `Published ${published.format(new Date(tile.publishedAt))}`
              ) : (
                <Skeleton className="h-4 w-40" />
              )}
            </p>

            {tile ? (
              tile.description && (
                <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line">
                  {tile.description}
                </p>
              )
            ) : (
              <span className="mt-3 grid gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </span>
            )}
            {tile && tile.tags.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2">
                {tile.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-lg bg-pastel-pink-soft px-3 py-1.5 text-xs"
                  >
                    #{tag.toLowerCase()}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-6 grid grid-cols-4 gap-3">
              <Stat
                icon={<LikesIcon />}
                value={count(tile?.likes)}
                label="Likes"
              />
              <Stat icon={<CommentsIcon />} value={null} label="Comments" />
              <Stat
                icon={<RemixIcon />}
                value={count(tile?.remixes)}
                label="Remixes"
              />
              <Stat
                icon={<ViewsIcon />}
                value={count(tile?.views)}
                label="Views"
              />
            </div>

            <Skeleton className="mt-6 h-[74px] rounded-2xl opacity-70" />
            <div className="mt-6 mb-2 flex justify-center gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="size-11 rounded-xl" />
              ))}
            </div>
          </section>

          <section className="border-t pt-4">
            <div className="flex items-center justify-between gap-3">
              <h2
                className={cn(
                  madimiOne.className,
                  "flex items-center gap-1 text-xl tracking-[0.02em]",
                )}
              >
                Comments
                <Skeleton className="h-5 w-7" />
              </h2>
              <Skeleton className="h-8 w-[104px] rounded-lg" />
            </div>
            <div className="mt-4 grid gap-4">
              {[0, 1].map((i) => (
                <div key={i} className="flex gap-2.5">
                  <Skeleton className="size-7 shrink-0 rounded-full" />
                  <span className="grid flex-1 gap-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className={cn("h-3", i ? "w-2/3" : "w-11/12")} />
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
