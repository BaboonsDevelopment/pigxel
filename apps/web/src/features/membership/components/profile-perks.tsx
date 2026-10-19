import Link from "next/link";
import { Badge as BadgeLabel } from "@pigxel/ui/components/badge";
import {
  Heading,
  Text,
  textLinkClassName,
} from "@pigxel/ui/components/typography";
import { PixelImage } from "@/components/ui/pixel-image";
import { loginUrl } from "@/lib/auth/routes";
import type { Badge, HiringProfile, PortfolioItem } from "../server";

export function ProfilePerks({
  badges,
  hiring,
  portfolio,
  isOwner,
  username,
  guest,
}: {
  badges: Badge[];
  hiring: HiringProfile | null;
  portfolio: PortfolioItem[];
  isOwner: boolean;
  username: string;
  guest: boolean;
}) {
  return (
    <>
      {(badges.length > 0 || isOwner) && (
        <section aria-label="Artist badges" className="mt-6">
          <div className="flex flex-wrap items-center gap-2">
            {badges.map((badge) => (
              <span
                key={badge.id}
                title={`${badge.label}${badge.sender ? ` · from @${badge.sender.username}` : ""}`}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                {badge.art?.thumbnail && (
                  <PixelImage
                    src={badge.art.thumbnail}
                    alt=""
                    className="size-7 object-contain"
                  />
                )}
                {badge.label}
              </span>
            ))}
            {isOwner && (
              <Link
                href="/settings/perks"
                className={`${textLinkClassName} text-xs`}
              >
                Manage member perks
              </Link>
            )}
          </div>
        </section>
      )}
      {!isOwner && (
        <Link
          href={
            guest
              ? loginUrl(
                  "login",
                  `/settings/perks?gift=${encodeURIComponent(username)}`,
                )
              : `/settings/perks?gift=${encodeURIComponent(username)}`
          }
          className={`${textLinkClassName} mt-4 inline-block text-xs`}
        >
          Gift a badge
        </Link>
      )}
      {hiring && (
        <section
          aria-labelledby="hiring-heading"
          className="mt-8 rounded-2xl border bg-background p-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Heading id="hiring-heading" size="section">
              {hiring.headline}
            </Heading>
            <BadgeLabel tone={hiring.available ? "success" : "muted"}>
              {hiring.available
                ? "Available for commissions"
                : "Currently unavailable"}
            </BadgeLabel>
          </div>
          <Text className="mt-3 whitespace-pre-line">{hiring.description}</Text>
          {hiring.contact_url && (
            <a
              href={hiring.contact_url}
              target="_blank"
              rel="noopener noreferrer"
              className={`${textLinkClassName} mt-3 inline-block text-sm`}
            >
              Contact this artist
            </a>
          )}
          {portfolio.length > 0 && (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-xl border p-3 hover:bg-muted/40"
                  >
                    {item.art?.thumbnail && (
                      <PixelImage
                        src={item.art.thumbnail}
                        alt=""
                        className="mb-3 aspect-video w-full rounded-lg object-contain"
                      />
                    )}
                    <p className="font-medium">{item.title}</p>
                    <Text tone="muted" className="mt-1 whitespace-pre-line">
                      {item.description}
                    </Text>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}
