import Link from "next/link";
import { cardVariants } from "@pigxel/ui/components/card";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { PixelImage } from "@/components/ui/pixel-image";
import { formatCount } from "@/features/explore/components/popular-card/helpers";
import type { PublicTile } from "@/features/profile/profile";
import { ViewAllLink } from "./view-all-link";

/** The most popular public works this week, from Explore. */
export function TrendingWorks({ works }: { works: PublicTile[] | null }) {
  return (
    <section
      aria-labelledby="trending-heading"
      className={cardVariants({
        tone: "lavender",
        className: "flex min-h-0 flex-col rounded-3xl",
      })}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading id="trending-heading">Trending works</Heading>
          <Text tone="muted" className="mt-0.5">
            What the community loves this week
          </Text>
        </div>
        <ViewAllLink href="/explore" variant="pill" className="shrink-0" />
      </div>
      {works?.length ? (
        <ul className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
          {works.map((work) => (
            <li
              key={work.id}
              className="group relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)]"
            >
              <Link
                href={`/explore/${work.id}`}
                aria-label={`Open ${work.name} by @${work.author.username}`}
                className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="relative block aspect-[16/10] overflow-hidden bg-checker lg:aspect-auto lg:min-h-0 lg:flex-1">
                  {work.thumbnail ? (
                    <PixelImage
                      src={work.thumbnail}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
                    />
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 px-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{work.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      @{work.author.username}
                    </span>
                  </span>
                  <span
                    className="flex shrink-0 items-center gap-1 text-xs text-accent-pink"
                    aria-label={`${work.likes} likes`}
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      className="size-3.5"
                    >
                      <path
                        d="M8 14s-5.5-3.4-5.5-7.2A3 3 0 0 1 8 4.6a3 3 0 0 1 5.5 2.2C13.5 10.6 8 14 8 14z"
                        fill="currentColor"
                      />
                    </svg>
                    {formatCount(work.likes)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed p-6 text-center">
          <Text tone="muted">
            {works
              ? "No public works yet. Publish yours to be the first."
              : "Couldn’t load trending works. Refresh to try again."}
          </Text>
        </div>
      )}
    </section>
  );
}
