import type { Metadata } from "next";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";

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
          Our orders are processed by Creem, our Merchant of Record, who handles
          refunds. Email us at{" "}
          <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> with the email
          address you paid with, or reply to your Creem receipt, and we’ll
          arrange the refund with Creem.
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
