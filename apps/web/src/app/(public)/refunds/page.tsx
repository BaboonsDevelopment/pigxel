import type { Metadata } from "next";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/components/legal/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Refund Policy · Pigxel" };

export default function Refunds() {
  const days = LEGAL.refundDays;
  return (
    <LegalPage
      title="Refund Policy"
      intro={
        <p>
          We want you to be happy with Pigxel. If a paid plan isn’t right for
          you, you can get your money back within {days} days of paying, no
          questions asked.
        </p>
      }
    >
      <LegalSection title="1. Who can get a refund">
        <ul>
          <li>
            A full refund of any subscription payment, the first one or a
            renewal, if you ask within {days} days of that payment.
          </li>
          <li>
            After {days} days, payments aren’t refunded, except where the law
            requires it. You can still cancel so the plan doesn’t renew.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How to ask">
        <p>
          Our orders are processed by Paddle.com, our Merchant of Record, who
          handles refunds. Reply to your Paddle receipt email or find your order
          at{" "}
          <a href="https://paddle.net" target="_blank" rel="noreferrer">
            paddle.net
          </a>
          , or email us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>{" "}
          and we’ll arrange it with Paddle.
        </p>
        <p>
          Refunds go back to the payment method you used, usually within 5–10
          business days depending on your bank.
        </p>
      </LegalSection>

      <LegalSection title="3. What happens after a refund">
        <p>
          The refunded plan ends and your account moves to the Free plan. Your
          tiles stay yours: you can still open, edit and export them.
        </p>
      </LegalSection>

      <LegalSection title="4. Cancelling">
        <p>
          You can cancel anytime from Settings › Subscription. Cancelling stops
          the next renewal; your plan stays until the end of the period you paid
          for.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
