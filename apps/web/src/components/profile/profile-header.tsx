import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Lead, PageTitle } from "@pigxel/ui/components/typography";
import { joinedLabel, type ArtistProfile } from "@/lib/profile/profile";
import { linkTitle } from "@/lib/profile/validation";
import { ProfileAvatar } from "./profile-avatar";

/** Avatar, names, description, links and counts at the top of a profile. */
export function ProfileHeader({
  profile,
  artCount,
  isOwner,
}: {
  profile: ArtistProfile;
  artCount: number;
  isOwner: boolean;
}) {
  const joined = joinedLabel(profile.joinedAt);
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-start">
      <ProfileAvatar
        name={profile.name}
        url={profile.avatarUrl}
        className="size-24 text-3xl sm:size-28"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <PageTitle className="text-2xl sm:text-3xl">
              {profile.name}
            </PageTitle>
            <Lead className="mt-1">
              @{profile.username}
              {joined && <> · {joined}</>}
            </Lead>
          </div>
          {isOwner && (
            <Link
              href="/settings/profile"
              className={buttonVariants({ variant: "secondary" })}
            >
              Edit profile
            </Link>
          )}
        </div>

        <p className="mt-4 text-sm">
          <span className="font-semibold tabular-nums">{artCount}</span>{" "}
          <span className="text-muted-foreground">
            {artCount === 1 ? "art" : "arts"}
          </span>
        </p>

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
                    className: "max-w-64 rounded-full text-sm font-normal",
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
    </header>
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
