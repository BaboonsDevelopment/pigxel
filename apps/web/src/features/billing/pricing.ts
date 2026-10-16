export type BillingCycle = "month" | "year";

export type PlanName = "Free" | "Starter" | "Pro" | "Advanced";

export type Limits = {
  /** Arts kept in Pigxel cloud. Enforced by the database: keep in step with private.cloud_tile_limit. */
  cloudTiles: number;
  /** AI tokens every calendar month. Free has none: the AI helper is for paid plans. */
  aiTokens: number;
};

export interface Tier {
  name: Exclude<PlanName, "Free">;
  description: string;
  features: string[];
  /** Creem products. These are the test-mode IDs; live mode has its own. */
  productId: Record<BillingCycle, string>;
  /** In cents, before tax. Keep in step with the Creem products. */
  price: Record<BillingCycle, number>;
  limits: Limits;
  highlighted?: boolean;
}

/** Creem products are priced in US dollars, with tax added at checkout. */
export const CURRENCY = "USD";

const count = (n: number) => n.toLocaleString("en-US");

const FREE_LIMITS: Limits = { cloudTiles: 5, aiTokens: 0 };

export const FREE_PLAN: {
  name: "Free";
  description: string;
  limits: Limits;
  features: string[];
} = {
  name: "Free",
  description: "Everything you need to start making pixel art.",
  limits: FREE_LIMITS,
  features: [
    "Every drawing tool",
    "Layers, frames, onion skin",
    "Palettes, mirror and tiled mode",
    "Every export format",
    `${FREE_LIMITS.cloudTiles} arts in Pigxel cloud`,
  ],
};

const paidFeatures = (below: PlanName, limits: Limits, extras: string[]) => [
  `Everything in ${below}`,
  `${count(limits.aiTokens)} AI tokens every month`,
  `${limits.cloudTiles} arts in Pigxel cloud`,
  ...extras,
];

const STARTER: Limits = { cloudTiles: 50, aiTokens: 1000 };
const PRO: Limits = { cloudTiles: 100, aiTokens: 2000 };
const ADVANCED: Limits = { cloudTiles: 200, aiTokens: 7000 };

export const TIERS: Tier[] = [
  {
    name: "Starter",
    description: "For artists who draw every week.",
    limits: STARTER,
    features: paidFeatures("Free", STARTER, [
      "Premium assets and tutorials",
      "Premium badge on your profile",
    ]),
    productId: {
      month: "prod_2GOqluekb0emjqMu1T2FNw",
      year: "prod_70SuiDz4RJE2qb2zhNVL6s",
    },
    price: { month: 700, year: 5000 },
  },
  {
    name: "Pro",
    description: "For serious projects and game art.",
    highlighted: true,
    limits: PRO,
    features: paidFeatures("Starter", PRO, ["Early access to new tools"]),
    productId: {
      month: "prod_5MXjzA3GUp1uXc1n2WNUoD",
      year: "prod_2n6kFkVPfvfF3lIUKS6iHC",
    },
    price: { month: 1000, year: 7500 },
  },
  {
    name: "Advanced",
    description: "For studios and heavy AI use.",
    limits: ADVANCED,
    features: paidFeatures("Pro", ADVANCED, ["Priority support"]),
    productId: {
      month: "prod_3iOeJD8GbTwrNeFMxZewrC",
      year: "prod_4WTkhxtFomX6vqXkOokXv5",
    },
    price: { month: 2000, year: 15000 },
  },
];

export function limitsOf(plan: PlanName): Limits {
  return TIERS.find((tier) => tier.name === plan)?.limits ?? FREE_LIMITS;
}

/**
 * The AI tokens a plan has now, and since when its usage counts: the current
 * calendar month (UTC). Free has none, so nothing to count.
 */
export function aiAllowance(plan: PlanName, now = new Date()) {
  const { aiTokens } = limitsOf(plan);
  if (plan === "Free") return { tokens: aiTokens, since: null, resetsAt: null };
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resetsAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return {
    tokens: aiTokens,
    since: since.toISOString(),
    resetsAt: resetsAt.toISOString(),
  };
}
