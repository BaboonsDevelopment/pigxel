"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@pigxel/ui/components/button";
import { Text, textLinkClassName } from "@pigxel/ui/components/typography";
import { confirmCheckout } from "../actions";

const CHECK_EVERY = 2000;
const GIVE_UP_AFTER = 30_000;

/** Confirms the checkout and refreshes until the account has its new plan. */
export function AwaitingPlan({ checkoutId }: { checkoutId?: string }) {
  const { refresh: refreshPage } = useRouter();
  const [waiting, setWaiting] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let stopped = false;
    let checking = false;
    const refresh = async () => {
      if (checking || stopped) return;
      checking = true;
      try {
        if (checkoutId) await confirmCheckout(checkoutId);
      } catch {
        // A later retry or the signed webhook can still confirm payment.
      } finally {
        checking = false;
        if (!stopped) refreshPage();
      }
    };
    const check = setInterval(() => void refresh(), CHECK_EVERY);
    if (checkoutId) void refresh();
    const stop = setTimeout(() => {
      stopped = true;
      clearInterval(check);
      setWaiting(false);
    }, GIVE_UP_AFTER);
    return () => {
      stopped = true;
      clearInterval(check);
      clearTimeout(stop);
    };
  }, [refreshPage, checkoutId, attempt]);

  return (
    <div className="mt-4">
      <Text size="md" tone="muted" role="status">
        {waiting
          ? "Finishing your subscription. This usually takes a few seconds…"
          : "We couldn’t confirm your plan yet. If you completed payment, check again or contact support with your Creem receipt. You don’t need to pay again."}
      </Text>
      {!waiting && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-4">
          <Button
            variant="secondary"
            onClick={() => {
              setWaiting(true);
              setAttempt((value) => value + 1);
            }}
          >
            Check again
          </Button>
          <Link href="/settings/subscription" className={textLinkClassName}>
            View subscription
          </Link>
          <a
            href="mailto:support@pigxel.studio?subject=Payment%20confirmation"
            className={textLinkClassName}
          >
            Contact support
          </a>
        </div>
      )}
    </div>
  );
}
