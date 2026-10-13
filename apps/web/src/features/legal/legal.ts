export const LEGAL = {
  /** The trading name people know. */
  operator: "Pigxel",
  /** Who is legally responsible: the trader behind Pigxel. */
  legalName: "Individual Entrepreneur Valerii Inshyn (ФОП Іншин Валерій)",
  /** РНОКПП of the ФОП; shown once set. */
  registrationNumber: null as string | null,
  address: "Romanchuka 12, Lviv, Ukraine",
  email: "support@pigxel.studio",
  jurisdiction: "Ukraine",
  hosting: "Vercel Inc. (USA)",
  minAge: 16,
  refundDays: 14,
  updated: "2026-10-13",
  draft: false,
} as const;

/** The version people accept: the Terms and Privacy Policy share one date. */
export const LEGAL_VERSION = LEGAL.updated;

/** What changed in this version, for people asked to accept it again. */
export const LEGAL_CHANGES =
  "They now explain sharing and remixing, the Assets license, moderation and appeals, how long we keep data and your rights, and Pigxel is now for people 16 and older. Payments now go through Creem, and the AI helper’s rules and moderation are spelled out.";

/** Set while someone who ticked the boxes signs up with Google or Apple. */
export const ACCEPT_COOKIE = "pigxel-accept";

/** Whether a signed-in person has accepted the current documents. */
export function hasAcceptedLegal(
  metadata: { legal_version?: unknown } | null | undefined,
) {
  return metadata?.legal_version === LEGAL_VERSION;
}

export const LEGAL_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/refunds", label: "Refund Policy" },
  { href: "/licenses", label: "Licenses" },
] as const;

/** One line naming the trader, for footers. */
export function businessLine() {
  return [
    LEGAL.legalName,
    LEGAL.registrationNumber && `reg. no. ${LEGAL.registrationNumber}`,
    LEGAL.address,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function legalDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
