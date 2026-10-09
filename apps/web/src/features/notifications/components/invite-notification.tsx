"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { cn } from "@pigxel/ui/lib/utils";
import { ProfileAvatar } from "@/features/profile/components/profile-avatar";
import { respondToInvite } from "@/features/sharing/actions";
import { projectKeys } from "@/features/tiles/queries/keys";
import type { AppNotification } from "../server";

type Invite = Extract<AppNotification, { kind: "share_invite" }>;

export function InviteNotification({
  item,
  onOpen,
}: {
  item: Invite;
  onOpen: () => void;
}) {
  const [answer, setAnswer] = useState<"accepted" | "declined" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();

  const respond = async (accept: boolean) => {
    setError(null);
    setAnswer(accept ? "accepted" : "declined");
    const result = await respondToInvite(item.tileId, accept);
    if (!result.error) {
      if (accept)
        void client.invalidateQueries({ queryKey: projectKeys.shared() });
      return;
    }
    setAnswer(null);
    setError(result.error);
  };

  return (
    <div
      className={cn(
        "flex gap-3 rounded-lg px-2 py-2",
        item.unread && !answer && "bg-primary-soft/35",
      )}
    >
      <ProfileAvatar name={item.name} url={item.avatarUrl} />
      <div className="min-w-0 flex-1 text-sm">
        {answer === "accepted" ? (
          <p className="animate-in fade-in duration-150">
            You joined “{item.tileName}”.{" "}
            <Link
              href="/tiles?tab=shared"
              onClick={onOpen}
              className="text-link-accent hover:underline"
            >
              Open Shared
            </Link>
          </p>
        ) : answer === "declined" ? (
          <p className="text-muted-foreground animate-in fade-in duration-150">
            You declined the invitation to “{item.tileName}”.
          </p>
        ) : (
          <>
            <p>
              <span className="font-semibold">{item.name}</span> invited you to{" "}
              {item.role === "editor" ? "edit" : "view"} “{item.tileName}”
            </p>
            <span className="block text-xs text-muted-foreground">
              {item.ago}
            </span>
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => void respond(true)}
              >
                Accept
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => void respond(false)}
              >
                Decline
              </Button>
            </div>
          </>
        )}
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
