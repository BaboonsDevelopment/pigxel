"use client";

import { useState, useTransition } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ProjectMenu } from "@/features/tiles/components/project-card/components/project-menu";
import { setBlocked } from "../actions";

export function BlockMenu({
  profileId,
  username,
  blocked,
}: {
  profileId: string;
  username: string;
  blocked: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const change = async (next: boolean) => {
    if (
      next &&
      !(await confirmDialog({
        title: `Block @${username}?`,
        message:
          "You won’t see each other’s arts or comments, you’ll unfollow each other, and they won’t be able to follow you. They won’t be told.",
        confirmLabel: "Block",
      }))
    )
      return;
    startTransition(async () => {
      setError(null);
      const result = await setBlocked(profileId, next);
      if (result.error) setError(result.error);
    });
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <ProjectMenu
        label="Profile options"
        placement="down"
        disabled={pending}
        items={[
          blocked
            ? {
                label: `Unblock @${username}`,
                onSelect: () => void change(false),
              }
            : {
                label: `Block @${username}`,
                destructive: true,
                onSelect: () => void change(true),
              },
        ]}
      />
      {error && (
        <FormMessage tone="error" className="text-xs">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
