import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";
import { Text } from "@pigxel/ui/components/typography";
import { Notice } from "@pigxel/ui/components/notice";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { PerkActionButton } from "@/features/membership/components/perk-forms";
import { discordConfig, discordInviteUrl } from "./config";
import { disconnectDiscord, retryDiscordSync } from "./actions";
import type { DiscordConnection } from "./server";

const MESSAGES: Record<string, string> = {
  connected: "Discord connected.",
  sync_pending:
    "Discord connected. Join the server and retry to receive your role.",
  cancelled: "Discord connection was cancelled.",
  invalid_state: "That connection request expired. Please try again.",
  failed:
    "Couldn’t connect Discord. Try again; this Discord account may already be linked to another Pigxel account.",
  unavailable: "Discord linking is not available yet.",
  disconnect_first:
    "Disconnect your current Discord account before linking another.",
};

export function DiscordPerk({
  connection,
  status,
}: {
  connection: DiscordConnection | null;
  status?: string;
}) {
  const configured = !!discordConfig();
  const invite = discordInviteUrl();
  return (
    <SettingsSection title="Discord community">
      {status && Object.hasOwn(MESSAGES, status) && (
        <Notice className="mt-3">{MESSAGES[status]}</Notice>
      )}
      <Text tone="muted" className="mt-2">
        Connect Discord to receive the premium role while your paid plan is
        active.
      </Text>
      {!configured ? (
        <Text tone="muted" className="mt-3">
          Discord linking is being prepared. Check back soon.
        </Text>
      ) : connection ? (
        <>
          <Text className="mt-3">
            Connected as {connection.username}.{" "}
            {connection.disconnect_requested
              ? "Disconnect pending."
              : connection.last_error
                ? "Your role needs another attempt."
                : connection.synced_premium
                  ? "Your premium role is active."
                  : "No premium role on your current plan."}
          </Text>
          {connection.last_error && (
            <Text tone="muted" className="mt-2">
              {connection.last_error}
            </Text>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <PerkActionButton action={retryDiscordSync}>
              Retry role update
            </PerkActionButton>
            <PerkActionButton action={disconnectDiscord}>
              Disconnect Discord
            </PerkActionButton>
          </div>
        </>
      ) : (
        <Link
          href="/auth/discord"
          className={buttonVariants({
            variant: "secondary",
            className: "mt-4",
          })}
        >
          Connect Discord
        </Link>
      )}
      {invite && (
        <a
          href={invite}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({
            variant: "secondary",
            className: "mt-4 ml-2",
          })}
        >
          Join our Discord
        </a>
      )}
    </SettingsSection>
  );
}
