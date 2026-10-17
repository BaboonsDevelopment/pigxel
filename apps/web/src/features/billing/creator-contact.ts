import { LEGAL } from "@/features/legal/legal";

/**
 * How creators reach us about the Creator plan. A channel without an address
 * isn't shown. The form must be private: the feedback board is public.
 */
export const CREATOR_CONTACT = {
  email: LEGAL.email,
  /** Full profile URL, such as https://instagram.com/pigxel. */
  instagram: null as string | null,
  /** A private application form (Tally, Google Forms…). */
  form: null as string | null,
};

const EMAIL_BODY = `Hi Pigxel team,

I'd like to join the Creator plan.

Where I post (links):
Audience size:
What I'd make with Pigxel:
`;

export const creatorEmailHref = () =>
  `mailto:${CREATOR_CONTACT.email}?subject=${encodeURIComponent("Creator plan")}&body=${encodeURIComponent(EMAIL_BODY)}`;
