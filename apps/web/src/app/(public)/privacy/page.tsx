import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import { LEGAL } from "@/features/legal/legal";
import { TRASH_DAYS } from "@/features/tiles/constants";

export const metadata: Metadata = {
  title: "Privacy Policy · Pigxel",
  description:
    "How Pigxel collects, uses, stores and shares account, artwork and Google Drive data, your rights, and how to request deletion.",
  robots: { nosnippet: true },
};

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <>
          <p>
            Pigxel is a browser-based pixel art editor with accounts, artwork
            storage, public profiles, sharing and an optional AI helper. This
            policy explains how Pigxel accesses, collects, uses, stores and
            shares your information, including information received through
            Google Sign-In and Google Drive, and the rights you have over it.
          </p>
          <p>
            The controller of your data is {LEGAL.legalName}, who runs{" "}
            {LEGAL.operator} from Ukraine. Contact details are at the end of
            this policy. It applies wherever you use Pigxel, including the
            European Union, the United Kingdom and the United States.
          </p>
        </>
      }
    >
      <LegalSection title="1. What we collect">
        <ul>
          <li>
            <strong>Agreements:</strong> when you accepted our Terms of Service
            and this policy, which versions, and that you confirmed you’re at
            least {LEGAL.minAge}.
          </li>
          <li>
            <strong>Account details:</strong> your email address, account ID,
            password (stored only as a secure hash), linked sign-in identities
            and authentication session. Google Sign-In may also provide your
            name and profile picture. Apple may provide a private relay email
            address instead of your real email.
          </li>
          <li>
            <strong>Profile:</strong> your username, display name, description,
            links, location and avatar and cover pictures if you add them,
            whether your profile is public, and whether your activity is shown.
          </li>
          <li>
            <strong>Your work:</strong> the tiles you save to Pigxel cloud and
            their earlier versions, thumbnails, folders, labels, pins,
            collections, the projects in your trash, which tiles you publish,
            and the days you worked on them (for your activity chart).
          </li>
          <li>
            <strong>Sharing:</strong> the people you share projects with, their
            roles, share links you create, and who is editing a shared project
            at the moment.
          </li>
          <li>
            <strong>Community:</strong> who you follow, the art you like, save,
            view or download (so each person is counted once), comments and
            replies, reports you make, accounts you block, notifications, and
            posts and votes on the feedback board. A feedback post also records
            the page you sent it from and your browser’s name and version, to
            help us reproduce bugs.
          </li>
          <li>
            <strong>AI requests:</strong> your prompts, conversation messages,
            reference pictures, and the artwork or selected areas submitted for
            an AI operation; saved chat history and AI usage records.
          </li>
          <li>
            <strong>Payments:</strong> handled by Creem. We receive your plan,
            its status and billing country, never your card details.
          </li>
          <li>
            <strong>Technical data:</strong> sign-in cookies, and the logs our
            hosting keeps, such as IP address, browser and the pages requested,
            to keep the Service running and secure.
          </li>
        </ul>
        <p>
          We don’t ask for sensitive information such as health, beliefs or
          ethnicity, and we don’t use your data to build advertising profiles.
        </p>
      </LegalSection>

      <LegalSection title="2. Kept in your browser">
        <p>
          Tiles you are working on, your open tabs, tool, brush, shortcut and
          layout settings, and pictures from AI chats are kept in your browser’s
          storage so they survive a reload. Local drafts are not automatically
          published. Their content leaves your device when you use features that
          need it, such as saving to Pigxel cloud or Google Drive, publishing
          artwork, or requesting AI assistance. You can remove them by clearing
          Pigxel’s site data in your browser; export work you want to keep
          first. The <Link href="/cookies">Cookie Policy</Link> lists every
          item.
        </p>
      </LegalSection>

      <LegalSection title="3. Why we use it, and our legal bases">
        <p>
          Data protection laws such as the GDPR and UK GDPR require a legal
          basis for each use of personal data. Ours are:
        </p>
        <ul>
          <li>
            <strong>Providing the Service</strong> — your account, saving,
            sharing and showing your work, profiles, following, comments and
            notifications: necessary to perform our contract with you.
          </li>
          <li>
            <strong>Running the AI helper</strong> when you ask it for
            something: performing our contract.
          </li>
          <li>
            <strong>Payments, tax and accounting records:</strong> our contract
            and our legal obligations.
          </li>
          <li>
            <strong>Security, preventing abuse and moderation</strong> —
            checking published art, handling reports and blocks, rate limits,
            logs: our legitimate interest in a safe service, and our legal
            obligations.
          </li>
          <li>
            <strong>Improving Pigxel</strong> from feedback posts and fixing
            bugs: our legitimate interest in a working product.
          </li>
          <li>
            <strong>Records of what you agreed to:</strong> our legal
            obligations and our legitimate interest in showing it.
          </li>
          <li>
            <strong>Embedded tutorial videos:</strong> your consent, which you
            can change at any time under “Cookie settings”.
          </li>
        </ul>
        <p>
          Where we rely on legitimate interests, you can object, as explained in
          section 11. We don’t sell your personal data, don’t share it for
          cross-context behavioural advertising, and don’t use it for
          advertising at all.
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
          and 7 apply. We do not sell Google user data or use it for
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
        <p>
          Before any AI request runs, the text you typed is screened by Creem’s
          moderation service, together with your account ID, to block requests
          that break our content rules. Images are not sent for this check.
        </p>
      </LegalSection>

      <LegalSection title="6. Automated checks of published art">
        <p>
          When you publish art, an image classifier running on our own servers
          checks it for sexual content. Nothing is sent to a third party for
          this. If the check flags it, the art is not published and you get a
          notification; your copy of the tile is not changed. This is a decision
          made by automated means. If you think it got it wrong, email us and a
          person will review it. Reports from other people about art, comments
          or profiles are reviewed by a person.
        </p>
      </LegalSection>

      <LegalSection title="7. Who we share it with">
        <p>
          We use these service providers to run Pigxel. They process data on our
          behalf and under our instructions, except Paddle, which acts as an
          independent controller for payments:
        </p>
        <ul>
          <li>
            <strong>Supabase Inc.</strong> (USA): accounts, sign-in, database
            and file storage.
          </li>
<<<<<<< HEAD
          <li>
            Creem: payments, as Merchant of Record, and screening of AI prompts.
          </li>
          <li>Google and Apple: when you choose to sign in with them.</li>
=======
>>>>>>> origin/dev
          <li>
            <strong>{LEGAL.hosting}</strong>: hosts the website and runs its
            servers, keeping short-lived request logs.
          </li>
          <li>
            <strong>Google LLC</strong> (USA): the Gemini AI helper, with the
            request content described in section 5; Google Sign-In and Google
            Drive when you choose them; and the email service we answer support
            emails with.
          </li>
          <li>
            <strong>Apple Inc.</strong> (USA): Sign in with Apple, when you
            choose it.
          </li>
          <li>
            <strong>Paddle.com Market Ltd</strong> (UK): payments, tax and
            invoices, as Merchant of Record.
          </li>
          <li>
            <strong>YouTube</strong> (Google): tutorial videos. Nothing is sent
            to YouTube until you allow videos or choose to play one.
          </li>
        </ul>
        <p>
          Public profile information, including your chosen display name and
          avatar, art you publish and your public comments can be viewed by
          other people, including visitors who aren’t signed in. Projects you
          share are visible to the people you share them with. Your private
          drafts and Google tokens are never published. We may also disclose
          information when necessary to comply with law, respond to a valid
          legal request or investigate security incidents and abuse.
        </p>
      </LegalSection>

      <LegalSection title="8. International transfers">
        <p>
          We are based in Ukraine and our providers process data in the United
          States, the United Kingdom and other countries. When data from the EU,
          EEA or UK is transferred to a country without an adequacy decision, we
          rely on the European Commission’s Standard Contractual Clauses, the UK
          International Data Transfer Addendum, or the EU–US Data Privacy
          Framework where a provider is certified under it. Email us for a copy
          of the safeguards that apply.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
<<<<<<< HEAD
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
          Google or Creem is subject to their retention policies.
=======
          Pigxel uses HTTPS for all communication. Authentication checks and
          database access rules restrict private records to authorized accounts;
          Drive refresh tokens are restricted to server-side access. These
          controls reduce unauthorized access, but no online service can
          guarantee complete security. If a breach puts your rights at risk,
          we’ll tell you and the authorities as the law requires.
>>>>>>> origin/dev
        </p>
      </LegalSection>

      <LegalSection title="10. How long we keep it">
        <ul>
          <li>
            <strong>
              Account, profile, saved work, chats and community data:
            </strong>{" "}
            while your account exists, or until you delete them.
          </li>
          <li>
            <strong>Trash:</strong> projects you delete stay in your trash for{" "}
            {TRASH_DAYS} days, then are erased.
          </li>
          <li>
            <strong>Notifications:</strong> deleted after 180 days.
          </li>
          <li>
            <strong>Feedback posts:</strong> the page and browser details are
            removed after 90 days; the post stays until you delete it.
          </li>
          <li>
            <strong>Drive connection:</strong> until you disconnect Drive.
          </li>
          <li>
            <strong>Billing records:</strong> kept by Paddle, and by us as long
            as tax and accounting law requires.
          </li>
          <li>
            <strong>Hosting logs:</strong> kept by our hosting provider for a
            short period under its log retention.
          </li>
          <li>
            <strong>After you delete your account:</strong> your data is deleted
            right away, except what we must keep by law or to resolve disputes.
            Backup copies are overwritten on our providers’ backup schedule.
          </li>
        </ul>
        <p>
          Account deletion does not remove files from your own Google Drive or
          drafts from your browser. You control those copies and can delete them
          separately. Export any work you want to keep before deleting your
          account.
        </p>
      </LegalSection>

      <LegalSection title="11. Your rights">
        <p>
          You can see and change your profile in Settings, make it private and
          hide your activity. In{" "}
          <Link href="/settings/account#your-data">Settings › Account</Link> you
          can download all your data and delete your account yourself (see{" "}
          <Link href="/account-deletion">Delete your account</Link>). You also
          have the right to:
        </p>
        <ul>
          <li>get a copy of your data, and have it sent to another service;</li>
          <li>correct data that’s wrong;</li>
          <li>have your data or your account deleted;</li>
          <li>
            limit how we use it, or object to uses based on legitimate
            interests;
          </li>
          <li>withdraw consent you gave, without affecting earlier use;</li>
          <li>ask for a person to review an automated decision (section 6).</li>
        </ul>
        <p>
          To use these rights, email us from the address on your account. We may
          need to confirm it’s you, and we answer within one month. They’re
          free. If you live in a US state with a privacy law, such as
          California, you have the rights to know, delete and correct your data
          and to not be discriminated against for using them; we don’t sell or
          share personal information. If we turn down a request, you can appeal
          by replying to our answer.
        </p>
        <p>
          You can complain to a data protection authority: in the EU, the one
          where you live or work; in the UK, the Information Commissioner’s
          Office; in Ukraine, the Ukrainian Parliament Commissioner for Human
          Rights. We’d appreciate the chance to fix it first.
        </p>
      </LegalSection>

      <LegalSection title="12. Cookies">
        <p>
          We only use cookies and browser storage that Pigxel needs to work,
          such as keeping you signed in. There are no advertising or tracking
          cookies. Tutorial videos come from YouTube and load only with your
          consent. The <Link href="/cookies">Cookie Policy</Link> lists
          everything.
        </p>
      </LegalSection>

      <LegalSection title="13. Children">
        <p>
          You must be at least {LEGAL.minAge} to use Pigxel. We don’t knowingly
          collect data from anyone younger. If you think someone under{" "}
          {LEGAL.minAge} has an account or has given us data, tell us and we’ll
          delete it.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          If we change this policy in a way that matters, we’ll tell you in the
          app or by email before it takes effect. The date at the top shows the
          latest version.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
