/**
 * Pigxel's plans, as the Pricing page shows them. Payments go through
 * Paddle. TODO before launch: set each paid plan's `monthly` price (in USD)
 * and its limits; a plan without a price shows as coming soon.
 */
export type Plan = {
  id: "free" | "plus" | "pro" | "ultimate";
  name: string;
  tagline: string;
  /** USD a month; null until the price is decided. */
  monthly: number | null;
  /** Everything in the plan, beyond what the one before it has. */
  features: string[];
  /** Pointed out as the best fit for most artists. */
  highlighted?: boolean;
};

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Everything you need to start making pixel art.",
    monthly: 0,
    features: [
      "Every drawing tool: pen, shapes, selections, shading, dither",
      "Layers, frames and onion skin",
      "Palettes, mirror drawing and tiled mode",
      "Export to PNG, GIF and sprite sheets",
      "Save to Pigxel cloud or Google Drive",
      "A few AI generations to try it out",
    ],
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "For artists who draw every week.",
    monthly: null,
    features: [
      "Everything in Free",
      "More AI generations every month",
      "More room in Pigxel cloud",
      "Premium badge on your profile",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious projects and game art.",
    monthly: null,
    highlighted: true,
    features: [
      "Everything in Plus",
      "Many more AI generations and animations",
      "Much more room in Pigxel cloud",
      "Early access to new tools",
    ],
  },
  {
    id: "ultimate",
    name: "Ultimate",
    tagline: "For studios and heavy AI use.",
    monthly: null,
    features: [
      "Everything in Pro",
      "The most AI generations",
      "The most room in Pigxel cloud",
      "Priority support",
    ],
  },
];
