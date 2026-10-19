import { buttonVariants } from "@pigxel/ui/components/button";
import { Card } from "@pigxel/ui/components/card";
import { SectionTitle, Text } from "@pigxel/ui/components/typography";
import { LEGAL } from "@/features/legal/legal";
import type { CurrentPlan } from "../subscription";

export function SubscriptionSupport({
  plan,
  email,
}: {
  plan: CurrentPlan;
  email?: string;
}) {
  const priority = plan.name === "Advanced";
  const subject = `${priority ? "[Priority] " : ""}Pigxel support`;
  const body = `Account email: ${email ?? ""}\nPlan: ${plan.name}\n${plan.name === "Free" ? "" : `Subscription: ${plan.subscriptionId}\n`}\nHow can we help?\n`;
  const href = `mailto:${LEGAL.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <Card className="mt-8">
      <SectionTitle>
        {priority ? "Priority support" : "Need a hand?"}
      </SectionTitle>
      <Text tone="muted" className="mt-2">
        {priority
          ? "Your plan includes priority support. Email us with your account details included so we can identify your subscription."
          : "Contact the Pigxel team for help with your account or subscription."}
      </Text>
      <a
        href={href}
        className={buttonVariants({ variant: "secondary", className: "mt-4" })}
      >
        {priority ? "Contact priority support" : "Contact support"}
      </a>
    </Card>
  );
}
