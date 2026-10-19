import Link from "next/link";
import { Notice } from "@pigxel/ui/components/notice";
import { Text, textLinkClassName } from "@pigxel/ui/components/typography";
import { PixelImage } from "@/components/ui/pixel-image";
import { requireUser } from "@/lib/auth/session";
import { DiscordPerk } from "@/features/discord/components";
import { discordConfig } from "@/features/discord/config";
import { getDiscordConnection } from "@/features/discord/server";
import { getCurrentPlan } from "@/features/billing/server";
import { SettingsSection } from "@/features/settings/components/settings-section";
import {
  getHiringProfile,
  listBadgeArt,
  listProfileBadges,
} from "@/features/membership/server";
import {
  removeBadge,
  removePortfolioItem,
  reorderPortfolioItems,
  setBadgeVisible,
} from "@/features/membership/actions";
import {
  GiftBadgeForm,
  HiringProfileForm,
  PortfolioItemForm,
  PerkActionButton,
} from "@/features/membership/components/perk-forms";

export const metadata = { title: "Member perks · Pigxel" };
export const dynamic = "force-dynamic";

export default async function MemberPerks({
  searchParams,
}: {
  searchParams: Promise<{ gift?: string; discord?: string }>;
}) {
  const user = await requireUser();
  const [plan, arts, badges, hiring, params] = await Promise.all([
    getCurrentPlan(user.id),
    listBadgeArt(user.id),
    listProfileBadges(user.id, true),
    getHiringProfile(user.id),
    searchParams,
  ]);
  const paid = plan.name !== "Free";
  const discord = discordConfig() ? await getDiscordConnection(user.id) : null;
  return (
    <>
      <DiscordPerk connection={discord} status={params.discord} />
      {!paid && (
        <Notice className="mb-6">
          A paid plan unlocks badge gifting and a hiring portfolio. You can
          manage received badges on any plan.{" "}
          <Link href="/pricing" className={textLinkClassName}>
            See plans
          </Link>
        </Notice>
      )}
      <SettingsSection title="Received badges">
        <Text tone="muted" className="mt-2">
          Gifts stay private until you choose to show them on your profile.
          Messages are only shown here.
        </Text>
        {!badges.length ? (
          <div className="mt-4 rounded-xl border border-dashed p-5">
            <Text tone="muted">
              No badges yet. Other artists can send you gifts from your profile.
            </Text>
            <Link
              href="/profile"
              className={`${textLinkClassName} mt-2 inline-block text-sm`}
            >
              View your profile →
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {badges.map((badge) => (
              <li key={badge.id} className="rounded-xl border p-4">
                <div className="flex items-center gap-3">
                  {badge.art?.thumbnail && (
                    <PixelImage
                      src={badge.art.thumbnail}
                      alt=""
                      className="size-12 rounded-lg object-contain"
                    />
                  )}
                  <div>
                    <p className="font-medium">{badge.label}</p>
                    <Text tone="muted">
                      From{" "}
                      {badge.sender ? (
                        <Link
                          href={`/u/${badge.sender.username}`}
                          className={textLinkClassName}
                        >
                          @{badge.sender.username}
                        </Link>
                      ) : (
                        "a Pigxel artist"
                      )}{" "}
                      · {badge.visible ? "Displayed on profile" : "Private"}
                    </Text>
                  </div>
                </div>
                {badge.message && (
                  <Text className="mt-2 whitespace-pre-line">
                    {badge.message}
                  </Text>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <PerkActionButton
                    action={setBadgeVisible.bind(
                      null,
                      badge.id,
                      !badge.visible,
                    )}
                  >
                    {badge.visible ? "Hide badge" : "Show on profile"}
                  </PerkActionButton>
                  <PerkActionButton
                    action={removeBadge.bind(null, badge.id)}
                    confirmMessage="Remove this gift permanently? You can hide it instead to keep it private."
                    destructive
                  >
                    Remove badge
                  </PerkActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SettingsSection>
      {paid && (
        <>
          <SettingsSection title="Gift a custom badge">
            <Text tone="muted" className="mt-2">
              Turn one of your published artworks into a gift for another
              artist. Up to five gifts per day.
            </Text>
            <GiftBadgeForm arts={arts} recipient={params.gift?.slice(0, 21)} />
          </SettingsSection>
          <SettingsSection title="Hiring profile">
            <Text tone="muted" className="mt-2">
              Show clients what you do and how to reach you. Your profile must
              be public for others to see this.
            </Text>
            <Link
              href="/profile"
              className={`${textLinkClassName} mt-3 inline-block text-sm`}
            >
              Preview your profile →
            </Link>
            <HiringProfileForm profile={hiring.profile} />
          </SettingsSection>
          <SettingsSection title="Portfolio work">
            <Text tone="muted" className="mt-2">
              {hiring.portfolio.length} of 12 projects. Edit your work or use
              the arrows to choose the order visitors see.
            </Text>
            <ul className="mt-4 space-y-3">
              {hiring.portfolio.map((item, index) => {
                const move = (direction: number) => {
                  const ids = hiring.portfolio.map((project) => project.id);
                  const target = index + direction;
                  if (target >= 0 && target < ids.length) {
                    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
                  }
                  return reorderPortfolioItems.bind(null, ids);
                };
                return (
                  <li key={item.id} className="rounded-xl border p-4">
                    <div className="flex items-start gap-3">
                      {item.art?.thumbnail && (
                        <PixelImage
                          src={item.art.thumbnail}
                          alt=""
                          className="size-14 shrink-0 rounded-lg object-contain"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${textLinkClassName} break-words`}
                        >
                          {item.title}
                        </a>
                        {item.description && (
                          <Text
                            tone="muted"
                            className="mt-1 whitespace-pre-line break-words"
                          >
                            {item.description}
                          </Text>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PerkActionButton
                        action={move(-1)}
                        disabled={index === 0}
                      >
                        ↑ Move up<span className="sr-only">: {item.title}</span>
                      </PerkActionButton>
                      <PerkActionButton
                        action={move(1)}
                        disabled={index === hiring.portfolio.length - 1}
                      >
                        ↓ Move down
                        <span className="sr-only">: {item.title}</span>
                      </PerkActionButton>
                      <PerkActionButton
                        action={removePortfolioItem.bind(null, item.id)}
                        confirmMessage="Remove this project from your portfolio? Your original artwork will stay in Pigxel."
                        destructive
                      >
                        Remove<span className="sr-only">: {item.title}</span>
                      </PerkActionButton>
                    </div>
                    <details className="mt-4 border-t pt-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        Edit project
                        <span className="sr-only">: {item.title}</span>
                      </summary>
                      <PortfolioItemForm arts={arts} item={item} />
                    </details>
                  </li>
                );
              })}
            </ul>
            {!hiring.portfolio.length && (
              <Text
                tone="muted"
                className="mt-4 rounded-xl border border-dashed p-5"
              >
                Show clients what you can make. Add your first project below.
              </Text>
            )}
            {hiring.portfolio.length < 12 ? (
              <details
                className="mt-5 rounded-xl border p-4"
                open={!hiring.portfolio.length}
              >
                <summary className="cursor-pointer text-sm font-medium">
                  Add a project
                </summary>
                <PortfolioItemForm arts={arts} />
              </details>
            ) : (
              <Text tone="muted" className="mt-4">
                Your portfolio is full. Edit or remove a project to make room.
              </Text>
            )}
          </SettingsSection>
        </>
      )}
    </>
  );
}
