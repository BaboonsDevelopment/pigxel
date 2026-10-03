import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";

export const metadata: Metadata = { title: "Terms of Service · Pigxel" };

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms are an agreement between you and {LEGAL.operator} (“we”,
          “us”), who runs Pigxel, a pixel art editor with an AI helper at this
          website (the “Service”). By creating an account or using the Service,
          you agree to them. If you don’t agree, please don’t use Pigxel.
        </p>
      }
    >
      <LegalSection title="1. Your account">
        <p>
          You need an account to save and share your work. You must be at least
          13 years old, or the minimum age for online services where you live if
          that is higher, and give accurate details when you sign up. You are
          responsible for what happens under your account; keep your password
          safe and tell us if you think someone else is using it.
        </p>
      </LegalSection>

      <LegalSection title="2. Your art">
        <p>
          What you make in Pigxel is yours. We don’t claim ownership of your
          tiles, drawings or animations.
        </p>
        <p>
          To run the Service we need permission to store, copy, process and show
          your content: for example to save it to Pigxel cloud, make thumbnails,
          send it to our AI providers when you ask the AI helper for something,
          and show it to others when you publish it on your profile. You give us
          that permission, worldwide and free of charge, only for running and
          improving the Service. It ends when you delete the content or your
          account, except for copies in backups, which are deleted over time.
        </p>
        <p>
          You confirm you have the right to everything you upload, such as
          reference pictures, and that publishing it doesn’t break anyone else’s
          rights.
        </p>
      </LegalSection>

      <LegalSection title="3. The AI helper">
        <p>
          The AI helper can draw, edit and animate with you. Its results come
          from machine learning models run by third parties, can be unexpected
          or wrong, and may look like existing work. You decide what to keep and
          are responsible for how you use it. Don’t ask it for anything that
          breaks these terms or the law. AI features can have usage limits that
          depend on your plan.
        </p>
      </LegalSection>

      <LegalSection title="4. What you mustn’t do">
        <ul>
          <li>
            Upload or publish anything illegal, hateful, harassing, sexual
            content involving minors, or content that infringes someone’s
            copyright or trademark.
          </li>
          <li>
            Try to break, overload or get around the security or limits of the
            Service, or access other people’s accounts or data.
          </li>
          <li>
            Scrape the Service, resell it, or use it to build a competing
            product.
          </li>
          <li>Pretend to be someone else, including in your username.</li>
        </ul>
        <p>
          We may remove content or suspend accounts that break these rules.
          Where it’s reasonable, we’ll tell you why first.
        </p>
      </LegalSection>

      <LegalSection title="5. Plans and payments">
        <p>
          Pigxel has a free plan and paid subscription plans, shown on the{" "}
          <Link href="/pricing">Pricing</Link> page. Our order process is
          conducted by our online reseller Paddle.com. Paddle.com is the
          Merchant of Record for all our orders. Paddle provides all customer
          service inquiries and handles returns.
        </p>
        <p>
          Subscriptions renew automatically each billing period until you
          cancel. You can cancel anytime in your settings; your plan then stays
          until the end of the period you paid for. Prices include or add taxes
          as shown at checkout. If we change a price, we’ll tell you before it
          applies to your next renewal. Refunds are covered by our{" "}
          <Link href="/refunds">Refund Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="6. Other services">
        <p>
          You can sign in with Google or Apple and save to Google Drive. Your
          use of those services is covered by their own terms. We only reach the
          files Pigxel creates or you open with it.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes and availability">
        <p>
          We keep improving Pigxel, so features can change, and the Service can
          sometimes be unavailable. We may update these terms; if a change
          matters, we’ll tell you in the app or by email before it takes effect.
          Using Pigxel after that means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="8. Ending your account">
        <p>
          You can stop using Pigxel anytime, and ask us to delete your account
          by emailing {LEGAL.email}. We may suspend or close accounts that
          seriously or repeatedly break these terms. Download anything you want
          to keep first: deleted work can’t be recovered.
        </p>
      </LegalSection>

      <LegalSection title="9. Disclaimers and liability">
        <p>
          The Service is provided “as is”. As far as the law allows, we don’t
          promise it will always be available, error-free or fit for a
          particular purpose, and we aren’t liable for lost work, lost profits
          or indirect damages. Our total liability for any claim is limited to
          what you paid us in the 12 months before it. Nothing in these terms
          limits rights you have as a consumer that the law doesn’t let us
          limit.
        </p>
      </LegalSection>

      <LegalSection title="10. Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}. Disputes
          go to the courts of {LEGAL.jurisdiction}, unless the law where you
          live as a consumer gives you the right to go to your local courts.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
