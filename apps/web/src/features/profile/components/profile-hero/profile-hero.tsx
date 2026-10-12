import Image from "next/image";
import Link from "next/link";
import { cn } from "@pigxel/ui/lib/utils";
import { PixelImage } from "@/components/ui/pixel-image";
import { madimiOne, PROFILE_HEADING } from "@/lib/fonts/madimi";
import { TokensButton } from "@/features/ai/components/tokens-button/tokens-button";
import { loginUrl } from "@/lib/auth/routes";
import { joinedLabel, monthLabel, type ArtistProfile } from "../../profile";
import { linkTitle } from "../../validation";
import { BlockMenu } from "../block-menu";
import { FollowButton } from "../follow-button";
import { ProfileAvatar } from "../profile-avatar";
import {
  CalendarIcon,
  LinkIcon,
  PencilIcon,
  PinIcon,
  SparkleIcon,
} from "./components/meta-icons";
import { ShareProfileButton } from "./components/share-profile-button";
import { BANNER_BUTTON, BANNER_HEIGHT, HERO_IMAGE } from "./constants";

export function ProfileHero({
  profile,
  isOwner,
  guest,
  follows,
  blocked,
  tabHref,
}: {
  profile: ArtistProfile;
  isOwner: boolean;
  guest: boolean;
  follows: { followers: number; followed: number; following: boolean };
  blocked: boolean;
  tabHref: (tab: string) => string;
}) {
  const joined = joinedLabel(profile.joinedAt);
  const premium = profile.premiumSince && monthLabel(profile.premiumSince);

  return (
    <header>
      <div className="relative">
        <div className="overflow-hidden rounded-xl bg-pastel-pink">
          {profile.coverUrl ? (
            <PixelImage
              src={profile.coverUrl}
              alt=""
              className={cn(BANNER_HEIGHT, "w-full object-cover")}
            />
          ) : (
            <Image
              src={HERO_IMAGE}
              alt=""
              width={1429}
              height={241}
              priority
              className={cn(BANNER_HEIGHT, "w-full object-cover")}
            />
          )}
        </div>
        <div className="absolute right-2.5 bottom-2.5 flex items-start gap-2">
          <ShareProfileButton username={profile.username} name={profile.name} />
          {isOwner ? (
            <Link href="/settings/profile" className={BANNER_BUTTON}>
              <PencilIcon />
              Edit profile
            </Link>
          ) : guest ? (
            <Link
              href={loginUrl("signup", `/u/${profile.username}`)}
              aria-label={`Sign up to follow ${profile.name}`}
              className={cn(
                BANNER_BUTTON,
                "bg-primary text-primary-foreground hover:bg-primary-hover",
              )}
            >
              + Follow
            </Link>
          ) : (
            <>
              {blocked ? (
                <span className={cn(BANNER_BUTTON, "cursor-default")}>
                  Blocked
                </span>
              ) : (
                <FollowButton
                  profileId={profile.id}
                  name={profile.name}
                  following={follows.following}
                />
              )}
              <div className="flex h-9 items-center rounded-lg bg-white px-0.5 shadow-md">
                <BlockMenu
                  profileId={profile.id}
                  username={profile.username}
                  blocked={blocked}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-start sm:px-6">
        <ProfileAvatar
          name={profile.name}
          url={profile.avatarUrl}
          className="relative z-10 -mt-8 size-24 border-4 border-white bg-pastel-pink text-3xl shadow-sm sm:size-32 sm:text-4xl"
        />
        <div className="min-w-0 flex-1 sm:pt-2">
          <h1
            className={cn(
              madimiOne.className,
              PROFILE_HEADING,
              "text-[32px] break-words",
            )}
          >
            {profile.name}
          </h1>
          <p className="text-xs text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 max-w-sm text-xs leading-relaxed whitespace-pre-line break-words">
              {profile.bio}
            </p>
          )}
          <ul className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            {profile.location && (
              <li className="flex items-center gap-1">
                <PinIcon />
                {profile.location}
              </li>
            )}
            {joined && (
              <li className="flex items-center gap-1">
                <CalendarIcon />
                {joined}
              </li>
            )}
            {premium && (
              <li className="flex items-center gap-1 text-primary">
                <SparkleIcon />
                Premium since {premium}
              </li>
            )}
            <li>
              <Link
                href={tabHref("followers")}
                scroll={false}
                className="transition-colors hover:text-foreground"
              >
                <span className="font-semibold text-foreground tabular-nums">
                  {follows.followers}
                </span>{" "}
                {follows.followers === 1 ? "follower" : "followers"}
              </Link>
            </li>
            <li>
              <Link
                href={tabHref("followed")}
                scroll={false}
                className="transition-colors hover:text-foreground"
              >
                <span className="font-semibold text-foreground tabular-nums">
                  {follows.followed}
                </span>{" "}
                following
              </Link>
            </li>
            {profile.links.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  target="_blank"
                  rel="nofollow noopener noreferrer ugc"
                  title={link.url}
                  className="flex max-w-48 items-center gap-1 text-link-accent transition-colors hover:text-lavender-foreground"
                >
                  <LinkIcon />
                  <span className="truncate">{linkTitle(link)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        {isOwner && <TokensButton card className="self-start sm:mt-3" />}
      </div>
    </header>
  );
}
