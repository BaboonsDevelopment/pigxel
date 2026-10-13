"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, DialogHeader } from "@pigxel/ui/components/dialog";
import { Text } from "@pigxel/ui/components/typography";
import { getAiBalance, listAiUsage } from "../../../../actions";
import { groupActions, tokens, type UsageAction } from "./helpers";

type Usage = {
  balance: { limit: number; left: number; resetsAt: string | null };
  actions: UsageAction[];
};

export function UsageDialog({ onClose }: { onClose: () => void }) {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAiBalance(), listAiUsage()])
      .then(([balance, rows]) =>
        setUsage({ balance, actions: groupActions(rows) }),
      )
      .catch(() => setError("Couldn’t load your AI tokens. Try again."));
  }, []);

  return (
    <Dialog
      onClose={onClose}
      size="sm"
      className="max-h-[min(40rem,calc(100dvh-2rem))]"
    >
      <DialogHeader title="AI tokens" />
      {error ? (
        <Text tone="error" className="p-5">
          {error}
        </Text>
      ) : !usage ? (
        <Text tone="muted" className="p-5">
          Loading…
        </Text>
      ) : (
        <>
          <Balance {...usage.balance} />
          <div className="min-h-0 flex-1 overflow-y-auto border-t px-5 py-3">
            {usage.actions.length === 0 ? (
              <Text tone="muted" className="py-2">
                Nothing spent yet: pictures, edits and animations will show up
                here.
              </Text>
            ) : (
              <ul className="divide-y">
                {usage.actions.map((action) => (
                  <li
                    key={action.at}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{action.kind}</span>
                      <Text as="span" size="xs" tone="muted" className="block">
                        {new Date(action.at).toLocaleString()}
                      </Text>
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">
                      −{tokens(action.credits)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}

function Balance({
  limit,
  left,
  resetsAt,
}: {
  limit: number;
  left: number;
  resetsAt: string | null;
}) {
  const resets =
    resetsAt &&
    new Date(resetsAt).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
  const share = limit ? left / limit : 0;
  if (limit === 0)
    return (
      <div className="px-5 pt-2 pb-5">
        <p className="font-semibold">The AI helper is for paid plans</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Starter, Pro and Advanced come with AI tokens every month, from 1 000
          to 7 000.{" "}
          <Link href="/pricing" className="underline underline-offset-2">
            See plans
          </Link>
        </p>
      </div>
    );
  return (
    <div className="px-5 pt-2 pb-5">
      <p className="flex items-baseline gap-2">
        <span className="font-display text-4xl tracking-tight tabular-nums">
          {tokens(left)}
        </span>
        <span className="text-sm text-muted-foreground">
          of {tokens(limit)} tokens left
        </span>
      </p>
      <div
        role="progressbar"
        aria-label="Tokens left"
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={left}
        className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${share > 0.1 ? "bg-primary" : "bg-destructive"}`}
          style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%` }}
        />
      </div>
      {resets && (
        <p className="mt-2 text-xs text-muted-foreground">
          Your tokens refill on {resets}.
        </p>
      )}
      {left <= 0 && (
        <p className="mt-2 text-xs text-destructive">
          You’ve used all your tokens, so the assistant can’t draw for now.
          {!resets && (
            <>
              {" "}
              <Link href="/pricing" className="underline underline-offset-2">
                See plans
              </Link>{" "}
              for monthly tokens.
            </>
          )}
        </p>
      )}
    </div>
  );
}
