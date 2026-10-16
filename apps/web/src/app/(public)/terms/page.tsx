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
          These terms cover your use of {LEGAL.operator} (“we”, “us”), a pixel
          art editor with an AI helper at this website (the “Service”). By
          creating an account or using the Service, you agree to them and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you don’t agree,
          please don’t use Pigxel.
        </p>
      }
    >
      <LegalSection title="1. Your account">
        <p>
          You need an account to save and share your work. You must be at least{" "}
          {LEGAL.minAge} years old, and give accurate details when you sign up.
          You are responsible for what happens under your account; keep your
          password safe and tell us if you think someone else is using it.
        </p>
      </LegalSection>

      <LegalSection title="2. Your art">
        <p>
          What you make in Pigxel is yours. We don’t claim ownership of your
          tiles, drawings or animations.
        </p>
        <p>
          To run the Service we need permission to store, copy, process and show
          your content: for example to save it to Pigxel cloud, make thumbnails
          and versions, send it to our AI providers when you ask the AI helper
          for something, show it to people you share it with, and show it to
          others when you publish it. You give us that permission, worldwide and
          free of charge, only for running and improving the Service. It ends
          when you delete the content or your account, except for copies in
          backups, which are deleted over time.
        </p>
        <p>
          You confirm you have the right to everything you upload, such as
          reference pictures, and that publishing it doesn’t break anyone else’s
          rights.
        </p>
      </LegalSection>

      <LegalSection title="3. Publishing, sharing and remixing">
        <p>
          When you publish art, anyone can view it, and signed-in people can
          like, comment on, save and download it. If you leave remixing on,
          other people can copy it into Pigxel, change it and publish the
          result, which links back to your original. You can turn remixing off
          or unpublish art at any time; copies already made stay with the people
          who made them.
        </p>
        <p>
          Art you download or remix from someone else is theirs. You may use it
          for personal, non-commercial purposes with credit to the artist; any
          other use needs the artist’s permission.
        </p>
        <p>
          When you share a project, the people you invite can see it and, if you
          let them, edit it. You are responsible for whom you share with.
        </p>
      </LegalSection>

      <LegalSection title="4. Assets and templates">
        <p>
          The sprites, tiles, palettes and templates we provide on the Assets
          page and in the editor are licensed to you to use in your own
          projects, including commercial ones such as games you sell. You may
          not resell or redistribute them on their own, for example as an asset
          pack. Palettes credited to their authors remain theirs.
        </p>
      </LegalSection>

      <LegalSection title="5. The AI helper">
        <p>
          The AI helper generates and edits pixel art from your text requests.
          It is part of the paid plans and uses machine learning models run by
          third parties (Google Gemini). Artwork it produces is AI-generated:
          its results can be unexpected or wrong, and may look like existing
          work. You decide what to keep and are responsible for how you use it.
          Each plan includes a monthly number of AI tokens.
        </p>
        <p>
          Every request is screened by an automated moderation service before it
          reaches the model, and requests that break these rules are blocked.
          The models also apply their own safety filters.
        </p>
        <p>You must not use the AI helper to create:</p>
        <ul>
          <li>
            sexual or sexually suggestive content, or any content involving
            minors in a sexual or harmful way;
          </li>
          <li>
            depictions of real, identifiable people, deepfakes, or face swaps;
          </li>
          <li>
            content that copies trademarks, logos, or copyrighted characters you
            don’t have rights to;
          </li>
          <li>hateful, harassing, violent, extremist, or self-harm content;</li>
          <li>anything illegal, or meant to deceive or defraud others.</li>
        </ul>
        <p>We may limit or suspend AI access for accounts that misuse it.</p>
      </LegalSection>

      <LegalSection title="6. What you mustn’t do">
        <ul>
          <li>
            Upload or publish anything illegal, hateful, harassing, sexual or
            violent, sexual content involving minors, or content that infringes
            someone’s copyright or trademark.
          </li>
          <li>
            Harass people, get around a block, or keep contacting someone who
            doesn’t want you to.
          </li>
          <li>
            Fake engagement: buy, trade or automate likes, follows, views,
            downloads or comments, use several accounts to boost your own art,
            or post spam.
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
      </LegalSection>

      <LegalSection title="7. Moderation and reports">
        <p>
          Published art is checked automatically for sexual content before it
          appears; flagged art isn’t published and you’re told. Anyone can
          report art, comments or profiles, and a person reviews reports. We may
          remove content, limit features or suspend accounts that break these
          terms or the law. When we do, we’ll tell you what we did and why,
          unless the law or safety prevents it.
        </p>
        <p>
          If you disagree with a decision, reply to our message or email us
          within six months and a person who didn’t make the decision will look
          at it again. This doesn’t affect your right to go to court or, in the
          EU, to use an out-of-court dispute settlement body.
        </p>
      </LegalSection>

      <LegalSection title="8. Plans and payments">
        <p>
          Pigxel has a free plan and paid subscription plans, shown on the{" "}
          <Link href="/pricing">Pricing</Link> page. Our order process is
          conducted by our online reseller Creem (creem.io). Creem is the
          Merchant of Record for all our orders and handles payments, taxes,
          invoices and refunds.
        </p>
        <p>
          Subscriptions renew automatically each billing period until you
          cancel. You can cancel anytime in Settings › Subscription; your plan
          then stays until the end of the period you paid for. The price shown
          before you pay is the total you’ll be charged, with any taxes. If we
          change a price, we’ll tell you before it applies to your next renewal,
          and you can cancel before then.
        </p>
        <p>
          If you are a consumer in the EU or UK, you have 14 days from a
          purchase to withdraw from it. Our{" "}
          <Link href="/refunds">Refund Policy</Link> gives everyone a full
          refund within {LEGAL.refundDays} days of each payment, which covers
          that right.
        </p>
      </LegalSection>

      <LegalSection title="9. Other services">
        <p>
          You can sign in with Google or Apple. Your use of those services is
          covered by their own terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes and availability">
        <p>
          We keep improving Pigxel, so features can change, and the Service can
          sometimes be unavailable. We may update these terms; if a change
          matters, we’ll tell you in the app or by email at least 30 days before
          it takes effect, and you can close your account if you don’t agree.
          Using Pigxel after that means you accept the new terms.
        </p>
      </LegalSection>

      <LegalSection title="11. Ending your account">
        <p>
          You can stop using Pigxel anytime, download your data and delete your
          account yourself in{" "}
          <Link href="/settings/account#delete-account">
            Settings › Account
          </Link>
          , or ask us to by emailing {LEGAL.email}. We may suspend or close
          accounts that seriously or repeatedly break these terms. Download
          anything you want to keep first: deleted work can’t be recovered.
        </p>
      </LegalSection>

      <LegalSection title="12. Disclaimers and liability">
        <p>
          The Service is provided “as is”. As far as the law allows, we don’t
          promise it will always be available, error-free or fit for a
          particular purpose, and we aren’t liable for lost work, lost profits
          or indirect damages. Our total liability for any claim is limited to
          what you paid us in the 12 months before it. Nothing in these terms
          limits rights you have as a consumer that the law doesn’t let us
          limit, or our liability for death, personal injury, fraud or gross
          negligence.
        </p>
      </LegalSection>

      <LegalSection title="13. Governing law">
        <p>
          These terms are governed by the laws of {LEGAL.jurisdiction}. Disputes
          go to the courts of {LEGAL.jurisdiction}, unless the law where you
          live as a consumer gives you the right to go to your local courts or
          keeps protections of your local law.
        </p>
      </LegalSection>

      <LegalSection title="14. Contact">
        <p>
          These terms are an agreement between you and {LEGAL.legalName}
          {LEGAL.registrationNumber &&
            `, registration number ${LEGAL.registrationNumber}`}
          , {LEGAL.address}, who runs {LEGAL.operator}.
        </p>
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
