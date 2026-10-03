import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import {
  joinedLabel,
  monthLabel,
  type ArtistProfile,
} from "@/lib/profile/profile";
import { linkTitle } from "@/lib/profile/validation";
import { TokensButton } from "@/components/tokens-button/tokens-button";
import { FollowButton, FollowerCount } from "./follow-button";
import { ProfileAvatar } from "./profile-avatar";

export function ProfileHeader({
  profile,
  isOwner,
  follows,
}: {
  profile: ArtistProfile;
  isOwner: boolean;
  follows: { followers: number; following: boolean };
}) {
  const joined = joinedLabel(profile.joinedAt);
  const premium = profile.premiumSince && monthLabel(profile.premiumSince);
  return (
    <header className="relative overflow-hidden rounded-3xl bg-linear-120 from-[#efe4fb] via-[#f6e6f3] to-[#fbe3ea] p-6 shadow-[0_10px_30px_-18px_rgb(120_80_160/0.45)] sm:p-8">
      <HeroPixels />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
        <ProfileAvatar
          name={profile.name}
          url={profile.avatarUrl}
          className="size-24 text-3xl ring-4 ring-white/80 sm:size-32 sm:text-4xl"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-3xl tracking-tight break-words sm:text-4xl">
                {profile.name}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                @{profile.username}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {premium && (
                  <li className="inline-flex items-center gap-1.5 rounded-full bg-linear-90 from-[#a47be0] to-[#e57fa6] px-3 py-1 text-xs font-semibold text-white shadow-sm">
                    <span aria-hidden="true">✦</span> Premium since {premium}
                  </li>
                )}
                {joined && (
                  <li className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs text-muted-foreground">
                    {joined}
                  </li>
                )}
              </ul>
              {isOwner && <TokensButton className="mt-3" />}
            </div>
            {isOwner ? (
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Link
                  href="/settings/profile"
                  className={buttonVariants({
                    variant: "secondary",
                    size: "lg",
                    className: "rounded-full bg-white/80 px-6",
                  })}
                >
                  Edit profile
                </Link>
                <FollowerCount count={follows.followers} />
              </div>
            ) : (
              <FollowButton
                profileId={profile.id}
                name={profile.name}
                {...follows}
              />
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 max-w-prose text-sm leading-relaxed whitespace-pre-line break-words">
              {profile.bio}
            </p>
          )}

          {profile.links.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {profile.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="nofollow noopener noreferrer ugc"
                    title={link.url}
                    className={buttonVariants({
                      variant: "secondary",
                      size: "sm",
                      className:
                        "max-w-64 rounded-full border-white/0 bg-white/70 text-sm font-normal",
                    })}
                  >
                    <LinkIcon />
                    <span className="truncate">{linkTitle(link)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </header>
  );
}

function HeroPixels() {
  const pixels: [string, string, number][] = [
    ["12%", "58%", 10],
    ["22%", "62%", 6],
    ["70%", "92%", 12],
    ["82%", "88%", 7],
    ["8%", "94%", 8],
  ];
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {pixels.map(([top, left, size]) => (
        <span
          key={`${top}${left}`}
          className="absolute bg-white/60"
          style={{ top, left, width: size, height: size }}
        />
      ))}
    </div>
  );
}

function LinkIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0 text-muted-foreground"
    >
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </svg>
  );
}
