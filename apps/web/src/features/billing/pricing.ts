export type BillingCycle = "month" | "year";

export interface Tier {
  name: "Starter" | "Pro" | "Advanced";
  description: string;
  features: string[];
  priceId: Record<BillingCycle, string>;
  highlighted?: boolean;
}

export const FREE_PLAN = {
  name: "Free",
  description: "Everything you need to start making pixel art.",
  features: [
    "Every drawing tool",
    "Layers, frames, onion skin",
    "Palettes, mirror and tiled mode",
    "PNG, GIF and sprite sheet export",
    "Pigxel cloud or Google Drive",
    "A few AI generations to try",
  ],
};

export const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "For artists who draw every week.",
    features: [
      "Everything in Free",
      "More AI generations every month",
      "More room in Pigxel cloud",
      "Premium badge on your profile",
    ],
    priceId: {
      month: "pri_01m3vs0rykyb689mzx3t4ndsn6",
      year: "pri_01m3vs6wrwmxaz91gkm2t17dtt",
    },
  },
  {
    name: "Pro",
    description: "For serious projects and game art.",
    highlighted: true,
    features: [
      "Everything in Starter",
      "Many more AI generations and animations",
      "Much more room in Pigxel cloud",
      "Early access to new tools",
    ],
    priceId: {
      month: "pri_01m3vsa4f1kft0r6h6dbwagm3h",
      year: "pri_01m3vsb7n5a9zp37dsb884ks79",
    },
  },
  {
    name: "Advanced",
    description: "For studios and heavy AI use.",
    features: [
      "Everything in Pro",
      "The most AI generations",
      "The most room in Pigxel cloud",
      "Priority support",
    ],
    priceId: {
      month: "pri_01m3vscnvgndss4jfexq5bfff0",
      year: "pri_01m3vsdmcy869wxsa9zc35s77y",
    },
  },
];
