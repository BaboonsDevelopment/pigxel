"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Text } from "@pigxel/ui/components/typography";

const CHECK_EVERY = 2000;
const GIVE_UP_AFTER = 30_000;

/** Refreshes the page until Paddle's webhook has stored the new plan. */
export function AwaitingPlan() {
  const router = useRouter();
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const check = setInterval(() => router.refresh(), CHECK_EVERY);
    const stop = setTimeout(() => {
      clearInterval(check);
      setWaiting(false);
    }, GIVE_UP_AFTER);
    return () => {
      clearInterval(check);
      clearTimeout(stop);
    };
  }, [router]);

  return (
    <Text size="md" tone="muted" className="mt-4" role="status">
      {waiting
        ? "Finishing your subscription. This usually takes a few seconds…"
        : "Paddle hasn’t confirmed your payment yet. If you were charged, your plan will appear in Settings → Subscription within a few minutes, and Paddle emails your receipt."}
    </Text>
  );
}
