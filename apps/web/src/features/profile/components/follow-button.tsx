"use client";

import { useOptimistic, useState, useTransition } from "react";
import { FormMessage } from "@pigxel/ui/components/field";
import { cn } from "@pigxel/ui/lib/utils";
import { setFollowing } from "../actions";
import { BANNER_BUTTON } from "./profile-hero/constants";

export function FollowButton({
  profileId,
  name,
  following,
}: {
  profileId: string;
  name: string;
  following: boolean;
}) {
  const [shown, apply] = useOptimistic(following, (_, next: boolean) => next);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !shown;
      apply(next);
      setError(null);
      const result = await setFollowing(profileId, next);
      if (result.error) setError(result.error);
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        aria-pressed={shown}
        aria-label={shown ? `Unfollow ${name}` : `Follow ${name}`}
        disabled={pending}
        onClick={toggle}
        className={cn(
          BANNER_BUTTON,
          !shown && "bg-primary text-primary-foreground hover:bg-primary-hover",
        )}
      >
        {shown ? "Following" : "+ Follow"}
      </button>
      {error && (
        <FormMessage tone="error" className="rounded-md bg-white px-2 text-xs">
          {error}
        </FormMessage>
      )}
    </div>
  );
}
