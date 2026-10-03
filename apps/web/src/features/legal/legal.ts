export const LEGAL = {
  operator: "Pigxel",
  address: "Romanchuka 12, Lviv, Ukraine",
  email: "valerii.inshyn@gmail.com",
  jurisdiction: "Ukraine",
  refundDays: 14,
  updated: "2026-10-03",
  draft: false,
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
