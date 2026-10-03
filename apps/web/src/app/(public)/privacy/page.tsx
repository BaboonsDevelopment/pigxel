import type { Metadata } from "next";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";

export const metadata: Metadata = { title: "Privacy Policy · Pigxel" };

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data Pigxel collects, why, who it’s
          shared with, and the choices you have. {LEGAL.operator} is the
          controller of this data.
        </p>
      }
    >
      <LegalSection title="1. What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your email address, and your name
            and profile picture if you sign in with Google or Apple.
          </li>
          <li>
            <strong>Profile:</strong> your username, display name, description,
            links, avatar and whether your profile is public.
          </li>
          <li>
            <strong>Your work:</strong> the tiles you save to Pigxel cloud,
            their thumbnails, which ones you publish or pin, and the days you
            worked on them (for your activity chart).
          </li>
          <li>
            <strong>Social:</strong> who you follow and who follows you.
          </li>
          <li>
            <strong>AI requests:</strong> what you write to the AI helper and
            the pictures sent with it.
          </li>
          <li>
            <strong>Payments:</strong> handled by Paddle. We receive your plan,
            its status and billing country, never your card details.
          </li>
          <li>
            <strong>Technical data:</strong> sign-in cookies, and the logs our
            hosting keeps, such as IP address and browser, to keep the Service
            secure.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Kept in your browser">
        <p>
          Tiles you are working on, and your tool settings, are kept in your
          browser’s local storage so nothing is lost when you reload. They stay
          on your device and reach us only if you save to Pigxel cloud.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we use it">
        <ul>
          <li>
            To provide the Service: your account, saving and showing your work,
            profiles, following and notifications (performing our contract with
            you).
          </li>
          <li>
            To run the AI helper when you ask it for something (performing our
            contract).
          </li>
          <li>
            To take payments and keep records the law requires (contract and
            legal obligation).
          </li>
          <li>
            To keep Pigxel secure, prevent abuse and fix problems (our
            legitimate interests).
          </li>
        </ul>
        <p>
          We don’t sell your personal data and don’t use it for advertising.
        </p>
      </LegalSection>

      <LegalSection title="4. Who we share it with">
        <p>
          Only with the services that run Pigxel for us, each under their own
          privacy terms:
        </p>
        <ul>
          <li>Supabase: accounts, database and file storage.</li>
          <li>
            OpenAI and Google (Gemini): the AI helper; your requests and the
            pictures sent with them.
          </li>
          <li>Paddle: payments, as Merchant of Record.</li>
          <li>Google and Apple: when you choose to sign in with them.</li>
          <li>
            Google Drive: when you connect it, Pigxel only reaches the files it
            creates or you open with it.
          </li>
          <li>Our hosting provider, which serves the website.</li>
        </ul>
        <p>
          Anyone can see a public profile and the arts published on it. We may
          also share data when the law requires it.
        </p>
      </LegalSection>

      <LegalSection title="5. International transfers">
        <p>
          Some of these services process data outside your country, including in
          the United States. Where that happens, we rely on safeguards such as
          the European Commission’s standard contractual clauses.
        </p>
      </LegalSection>

      <LegalSection title="6. How long we keep it">
        <p>
          We keep your data while you have an account. When you delete your
          account, your profile, tiles and follows are deleted; copies in
          backups disappear over time. Payment records are kept as long as tax
          law requires.
        </p>
      </LegalSection>

      <LegalSection title="7. Your rights">
        <p>
          You can see and change your profile in Settings, make it private, and
          download your tiles. You can also ask us to delete your account, for a
          copy of your data, to correct or delete it, to limit or object to how
          we use it, or to move it elsewhere, by emailing us. If you think we
          handle your data wrongly, you can complain to your data protection
          authority.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          We only use cookies needed to keep you signed in. There are no
          advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="9. Children">
        <p>
          Pigxel isn’t meant for children under 13, and we don’t knowingly
          collect their data. If you think a child has given us data, tell us
          and we’ll delete it.
        </p>
      </LegalSection>

      <LegalSection title="10. Changes">
        <p>
          If we change this policy in a way that matters, we’ll tell you in the
          app or by email before it takes effect.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
