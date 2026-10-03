"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@pigxel/ui/components/button";
import { FormMessage } from "@pigxel/ui/components/field";
import { setFollowing } from "@/app/(app)/u/[username]/actions";

export function FollowButton({
  profileId,
  name,
  following,
  followers,
}: {
  profileId: string;
  name: string;
  following: boolean;
  followers: number;
}) {
  const [state, apply] = useOptimistic(
    { following, followers },
    (_, next: boolean) => ({
      following: next,
      followers: followers + (next === following ? 0 : next ? 1 : -1),
    }),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const next = !state.following;
      apply(next);
      setError(null);
      const result = await setFollowing(profileId, next);
      if (result.error) setError(result.error);
    });

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button
        type="button"
        size="lg"
        variant={state.following ? "secondary" : "primary"}
        aria-pressed={state.following}
        aria-label={state.following ? `Unfollow ${name}` : `Follow ${name}`}
        disabled={pending}
        onClick={toggle}
        className="rounded-full px-6 aria-pressed:border-border aria-pressed:bg-white/80 aria-pressed:text-foreground"
      >
        {state.following ? "Following" : "+ Follow"}
      </Button>
      <FollowerCount count={state.followers} />
      {error && (
        <FormMessage tone="error" className="text-xs">
          {error}
        </FormMessage>
      )}
    </div>
  );
}

export function FollowerCount({ count }: { count: number }) {
  return (
    <p className="text-sm">
      <span className="font-semibold tabular-nums">{count}</span>{" "}
      <span className="text-muted-foreground">
        {count === 1 ? "follower" : "followers"}
      </span>
    </p>
  );
}
