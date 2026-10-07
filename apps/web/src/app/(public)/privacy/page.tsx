import type { Metadata } from "next";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Pigxel",
  description:
    "How Pigxel collects, uses, stores and shares account, artwork and Google Drive data, and how to disconnect or request deletion.",
  robots: { nosnippet: true },
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          Pigxel is a browser-based pixel art editor with accounts, artwork
          storage, public profiles and an optional AI helper. This policy
          explains how Pigxel accesses, collects, uses, stores and shares your
          information, including information received through Google Sign-In and
          Google Drive. {LEGAL.operator} is responsible for this service and is
          the controller of this data.
        </p>
      }
    >
      <LegalSection title="1. What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your email address, account ID,
            linked sign-in identities and authentication session. Google Sign-In
            may also provide your name and profile picture. Apple may provide a
            private relay email address instead of your real email.
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
            <strong>AI requests:</strong> your prompts, conversation messages,
            reference pictures, and the artwork or selected areas submitted for
            an AI operation; saved chat history and AI usage records.
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
          browser’s local storage to restore work after a reload. Local drafts
          are not automatically published. Their content leaves your device when
          you use features that need it, such as saving to Pigxel cloud or
          Google Drive, publishing artwork, or requesting AI assistance. You can
          remove local drafts and preferences by clearing Pigxel’s site data in
          your browser; export work you want to keep first.
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

      <LegalSection title="4. Google account and Google Drive data">
        <p>
          <strong>Google Sign-In:</strong> with your authorization, Pigxel
          receives your Google account identifier, email address and available
          basic profile information, including your name and profile picture,
          through Google’s OpenID Connect sign-in permissions. We use these to
          authenticate you, connect the Google identity to your Pigxel account,
          and populate your profile. Authentication and profile records are
          stored in Supabase. You can edit your profile and its visibility in
          Settings.
        </p>
        <p>
          <strong>Google Drive:</strong> when Drive integration is enabled and
          you authorize it, Pigxel requests the{" "}
          <code>https://www.googleapis.com/auth/drive.file</code> permission.
          This limits access to files created by Pigxel or specifically made
          available to it; it does not grant access to your entire Drive. Pigxel
          lists accessible Pigxel files and reads their file IDs, names and
          modification times. When you open a file, we read its artwork contents
          into the editor. When you save, we create or update that file’s name
          and contents in your Drive. These actions let you save, reopen and
          continue editing your pixel art.
        </p>
        <p>
          <strong>Authorization storage:</strong> Pigxel stores the connected
          Google email and an OAuth refresh token in a server-only Supabase
          database table. The server uses that token to obtain short-lived
          access tokens so your Drive connection can continue across sessions.
          The browser receives a short-lived token to communicate with Google
          Drive over HTTPS. The saved refresh token is not available through the
          browser database client. Pigxel never receives your Google password.
        </p>
        <p>
          <strong>Purpose and sharing:</strong> we use Google data to provide
          the sign-in, profile and Drive features described here. Google and
          Supabase process the data needed to provide those features. Opening a
          Drive file does not itself publish its contents or send them to an AI
          service. If you subsequently publish that artwork or request an AI
          operation using it, the visibility and sharing described in sections 5
          and 6 apply. We do not sell Google user data or use it for
          advertising, credit decisions or data brokerage.
        </p>
        <p>
          <strong>Disconnecting:</strong> use the Google Drive disconnect
          control in Account settings to delete Pigxel’s saved Drive connection
          and request revocation of its Google token. You can also revoke
          Pigxel’s access directly in your{" "}
          <a href="https://myaccount.google.com/connections">
            Google Account connections
          </a>
          . Revoking Google access prevents further authorized Drive access, but
          does not delete your Pigxel account or artwork files in Drive. Delete
          those files in Google Drive if you no longer want them.
        </p>
        <p>
          Pigxel’s use and transfer of information received from Google APIs
          will adhere to the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements. Pigxel does not use Google
          Workspace API data to develop, improve or train generalized or
          non-personalized AI or machine-learning models.
        </p>
      </LegalSection>

      <LegalSection title="5. AI assistance">
        <p>
          AI assistance runs when you request an AI feature. Depending on the
          operation, Pigxel sends your prompt, relevant recent conversation,
          reference images, canvas image or selected area, and editing context
          such as layer names to Google’s Gemini API. The purpose is to
          generate, analyze or edit artwork, or answer your request. This may
          include artwork you previously opened from Drive if you choose to use
          it in an AI operation. Your Google sign-in credentials and Drive
          authorization tokens are not included in AI requests.
        </p>
        <p>
          Chat history associated with a tile is stored in Supabase so you can
          resume it; usage records support your AI allowance. Google processes
          submitted AI content through a billing-enabled project under the{" "}
          <a href="https://ai.google.dev/gemini-api/terms">
            Gemini API paid-service terms
          </a>
          . Under those terms, Google does not use your prompts or responses to
          improve its products, but may retain them for a limited period for
          safety, abuse prevention and required legal disclosures. Avoid
          submitting personal information or confidential material you do not
          want processed by that service.
        </p>
      </LegalSection>

      <LegalSection title="6. Who we share it with">
        <p>
          Only with the services that run Pigxel for us, each under their own
          privacy terms:
        </p>
        <ul>
          <li>Supabase: accounts, database and file storage.</li>
          <li>
            Google (Gemini): the AI helper, with the request content described
            in section 5.
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
          Public profile information, including your chosen display name and
          avatar, and artwork you publish can be viewed by other people. Your
          private drafts and Google tokens are not published with your profile.
          We may also disclose information when necessary to comply with law,
          respond to a valid legal request or investigate security incidents and
          abuse.
        </p>
      </LegalSection>

      <LegalSection title="7. Security and international processing">
        <p>
          Pigxel uses HTTPS for communication with Google and its backend
          services. Authentication checks and database access rules restrict
          private records to authorized accounts; Drive refresh tokens are
          restricted to server-side access. These controls reduce unauthorized
          access, but no online service can guarantee complete security.
        </p>
        <p>
          Our service providers may process information outside your country,
          including in the United States. Their processing locations and
          applicable data-protection arrangements depend on the service used.
          Contact us for information about the processing of your data.
        </p>
      </LegalSection>

      <LegalSection title="8. Retention and deletion">
        <p>
          We retain account, profile, saved artwork and associated chat records
          while needed to provide your account and the features you use. We keep
          a Drive connection token while the connection remains active;
          disconnecting it removes the saved connection record. Revoking Google
          authorization does not automatically remove information already saved
          to your Pigxel profile or cloud storage.
        </p>
        <p>
          To request deletion of your Pigxel account, Google-derived account
          information, cloud artwork or chat history, contact us using the
          details below and identify the account and data concerned. We may need
          to verify account ownership before carrying out your request. We
          delete data no longer needed for the service unless retention is
          required for legal obligations, billing records, security or resolving
          disputes. Backup copies may remain until they are replaced or expire
          under the provider’s backup lifecycle. Data held independently by
          Google or Paddle is subject to their retention policies.
        </p>
        <p>
          Account deletion does not remove files from your own Google Drive or
          drafts from your browser. You control those copies and can delete them
          separately. Export any work you want to keep before requesting
          deletion.
        </p>
      </LegalSection>

      <LegalSection title="9. Your choices and rights">
        <p>
          You can see and change your profile in Settings, make it private, and
          download your tiles. You can also ask us to delete your account, for a
          copy of your data, to correct or delete it, to limit or object to how
          we use it, or to move it elsewhere, by emailing us. If you think we
          handle your data wrongly, you can complain to your data protection
          authority.
        </p>
      </LegalSection>

      <LegalSection title="10. Cookies">
        <p>
          We only use cookies needed to keep you signed in. There are no
          advertising or tracking cookies.
        </p>
      </LegalSection>

      <LegalSection title="11. Children">
        <p>
          Pigxel isn’t meant for children under 13, and we don’t knowingly
          collect their data. If you think a child has given us data, tell us
          and we’ll delete it.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          If we change this policy in a way that matters, we’ll tell you in the
          app or by email before it takes effect.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
