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
          These terms describe the rules for using Pigxel, including the pixel
          art editor, the AI helper, public profiles, and related services.
        </p>
      }
    >
      <LegalSection title="Using Pigxel">
        <p>
          You may use Pigxel to draw and animate pixel art, organize your tiles
          and assets, export your work, publish it on your profile, and get help
          from the AI helper. You are responsible for the information you add
          and for keeping your account credentials secure.
        </p>
        <p>
          You must not use Pigxel to upload unlawful content, violate someone
          else’s rights, abuse the service, interfere with security, or attempt
          to access accounts or data that are not yours.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and Content">
        <p>
          You retain ownership of the art you create. By adding content to
          Pigxel, you give us permission to host, process, display, and share it
          as needed to provide the service and honor the visibility settings you
          choose.
        </p>
        <p>
          If you publish a tile on your profile, other people can view it.
          Please review what you publish before sharing.
        </p>
      </LegalSection>

      <LegalSection title="AI Helper">
        <p>
          Pigxel includes an AI helper that generates and edits pixel art from
          your text requests. It uses machine learning models run by third-party
          providers (Google Gemini). Artwork the AI helper produces is
          AI-generated; results can be unexpected or inaccurate, and you decide
          what to keep and are responsible for how you use it.
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
        <p>
          We may remove such content and limit or suspend AI access for accounts
          that misuse the AI helper.
        </p>
      </LegalSection>

      <LegalSection title="Subscriptions">
        <p>
          Pigxel offers a free plan and paid plans. Prices, billing periods, and
          what each plan includes are shown on the{" "}
          <Link href="/pricing">Pricing</Link> page and at checkout.
        </p>
        <p>
          Our order process is conducted by our online reseller Creem
          (creem.io). Creem is the Merchant of Record for all our orders and
          handles payments, taxes, invoices, and refunds.
        </p>
        <p>
          Paid subscriptions renew automatically unless canceled. You can cancel
          anytime in Settings › Subscription; canceling stops future renewals
          and your plan stays active until the end of the period you paid for.
          Refunds are covered by our <Link href="/refunds">Refund Policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Third-Party Services">
        <p>
          Pigxel may rely on third-party services for authentication, payments,
          AI generation, analytics, hosting, and data storage, such as Google
          sign-in and Google Drive. Those services may process information
          according to their own terms and policies.
        </p>
      </LegalSection>

      <LegalSection title="Service Changes">
        <p>
          We may update, suspend, or discontinue parts of Pigxel as the product
          evolves. We may also update these terms when needed. Continued use of
          Pigxel after changes means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="Ending Your Account">
        <p>
          You can stop using Pigxel anytime and ask us to delete your account by
          emailing {LEGAL.email}. We may suspend or close accounts that break
          these terms. Download anything you want to keep first: deleted work
          can’t be recovered.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and Liability">
        <p>
          Pigxel is provided on an as-is and as-available basis. We work to keep
          the service reliable, but we do not guarantee uninterrupted access or
          that AI results will meet your expectations.
        </p>
        <p>
          To the maximum extent permitted by law, Pigxel is not liable for
          indirect, incidental, special, consequential, or punitive damages
          arising from your use of the service. Nothing in these terms limits
          rights you have as a consumer that the law doesn’t let us limit.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
