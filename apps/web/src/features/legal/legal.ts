export const LEGAL = {
  operator: "[COMPANY NAME]",
  address: "[REGISTERED ADDRESS]",
  email: "[CONTACT EMAIL]",
  jurisdiction: "Ukraine",
  refundDays: 14,
  updated: "2026-09-30",
  draft: true,
} as const;

export const LEGAL_LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
] as const;

export function legalDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
