/**
 * The facts the Terms, Privacy and Refund pages are built from, kept in
 * one place. TODO before launch: fill in the placeholders in brackets, have
 * the pages reviewed, then set `draft` to false to take the draft notice off.
 */
export const LEGAL = {
  /** Who runs Pigxel: a company, or a person's full name. */
  operator: "[COMPANY NAME]",
  address: "[REGISTERED ADDRESS]",
  email: "[CONTACT EMAIL]",
  /** Whose laws the Terms follow. */
  jurisdiction: "Ukraine",
  /** How long after a payment it can be refunded, no questions asked. */
  refundDays: 14,
  /** When the pages last changed, as an ISO date. */
  updated: "2026-09-30",
  /** Shows a notice that the pages are still being prepared. */
  draft: true,
} as const;

/** The public pages about plans and policies, for footers. */
export const LEGAL_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
] as const;

/** "September 30, 2026". */
export function legalDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
