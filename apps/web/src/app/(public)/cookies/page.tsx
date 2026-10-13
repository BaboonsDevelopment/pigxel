import type { Metadata } from "next";
import Link from "next/link";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";

export const metadata: Metadata = {
  title: "Cookie Policy · Pigxel",
  description:
    "Every cookie and browser storage item Pigxel uses, what it’s for and how long it lasts.",
};

type Item = { name: string; kind: string; purpose: string; lasts: string };

const NECESSARY: Item[] = [
  {
    name: "sb-…-auth-token",
    kind: "Cookie",
    purpose: "Keeps you signed in (set by Supabase, our sign-in provider).",
    lasts: "Until you sign out, at most 400 days",
  },
  {
    name: "pigxel-accept",
    kind: "Cookie",
    purpose:
      "Remembers, while you sign up with Google or Apple, that you accepted our terms.",
    lasts: "15 minutes",
  },
  {
    name: "pigxel:consent:v1",
    kind: "Local storage",
    purpose: "Remembers your cookie choice, so we don’t ask again.",
    lasts: "Until you change it or clear site data",
  },
  {
    name: "sb-…-auth-token-code-verifier",
    kind: "Cookie",
    purpose: "Secures signing in with Google or Apple.",
    lasts: "Until sign-in finishes",
  },
];

const FUNCTIONAL: Item[] = [
  {
    name: "pigxel (IndexedDB) and pigxel:draft:…, pigxel:pen:…",
    kind: "IndexedDB, local storage",
    purpose: "Your unsaved tiles, so a reload doesn’t lose work.",
    lasts: "Until you save or delete them, or clear site data",
  },
  {
    name: "pigxel:tabs:…",
    kind: "Local storage",
    purpose: "The tiles you have open in the editor.",
    lasts: "Until you clear site data",
  },
  {
    name: "pigxel:layout:…, pigxel:layout-at:…, pigxel:layout-presets:…, pigxel:keys:…, pigxel:brushes:…, pigxel:new-tile:…",
    kind: "Local storage",
    purpose:
      "Editor panels, layout presets, keyboard shortcuts, brushes and new-tile settings.",
    lasts: "Until you clear site data",
  },
  {
    name: "pigxel:pinned:…, pigxel:opened:…, pigxel:archived:…",
    kind: "Local storage",
    purpose:
      "Pins, recent opens and archive marks for tiles kept in this browser.",
    lasts: "Until you clear site data",
  },
  {
    name: "pigxel-ai-pictures",
    kind: "Cache storage",
    purpose:
      "Pictures from your AI chats, so they show without downloading again.",
    lasts: "Until you clear site data",
  },
  {
    name: "pigxel:explore-order, pigxel:viewed:…",
    kind: "Session storage",
    purpose:
      "Keeps Explore in the same order while you browse, and counts your view of a piece of art once.",
    lasts: "Until you close the tab",
  },
];

const THIRD_PARTY: Item[] = [
  {
    name: "YouTube (youtube-nocookie.com)",
    kind: "Cookies and storage",
    purpose:
      "Plays tutorial videos. Loads only if you allow videos or choose to play one; see Google’s privacy policy.",
    lasts: "Set by YouTube",
  },
  {
    name: "Creem (creem.io)",
    kind: "Cookies and storage",
    purpose:
      "Runs checkout and the billing portal on Creem’s own site, including fraud prevention, once you choose a plan; see Creem’s privacy policy.",
    lasts: "Set by Creem",
  },
];

function ItemTable({ items }: { items: Item[] }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2 pr-4 font-semibold">
              Name
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              Type
            </th>
            <th scope="col" className="py-2 pr-4 font-semibold">
              What it’s for
            </th>
            <th scope="col" className="py-2 font-semibold">
              How long
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.name} className="border-b align-top">
              <td className="py-2 pr-4 font-mono text-xs break-words">
                {item.name}
              </td>
              <td className="py-2 pr-4">{item.kind}</td>
              <td className="py-2 pr-4">{item.purpose}</td>
              <td className="py-2">{item.lasts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Cookies() {
  return (
    <LegalPage
      title="Cookie Policy"
      intro={
        <p>
          Cookies and browser storage are small pieces of data a website keeps
          on your device. Pigxel only uses them to make the Service work: to
          keep you signed in, to keep your work and settings, and to play
          embedded videos and take payments. We use no advertising, analytics or
          tracking cookies. How we handle personal data is in our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      }
    >
      <LegalSection title="1. Strictly necessary">
        <p>
          Without these you can’t sign in or keep your choices. They don’t need
          your consent.
        </p>
        <ItemTable items={NECESSARY} />
      </LegalSection>

      <LegalSection title="2. Your work and settings">
        <p>
          Stored only in your browser, never sent to us on their own, and used
          only for features you use. They don’t need your consent. The “…” in a
          name is your account ID or a tile’s ID.
        </p>
        <ItemTable items={FUNCTIONAL} />
      </LegalSection>

      <LegalSection title="3. Other companies">
        <p>
          Some pages include services from other companies, which use their own
          cookies under their own policies. YouTube videos are optional: they
          load only with your consent, which you can change at any time under
          “Cookie settings” at the bottom of the page.
        </p>
        <ItemTable items={THIRD_PARTY} />
      </LegalSection>

      <LegalSection title="4. Your choices">
        <p>
          You can see and delete cookies and site data in your browser’s
          settings. If you block the strictly necessary cookies you won’t be
          able to sign in, and clearing site data deletes unsaved tiles, so save
          or export them first.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
