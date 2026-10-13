import type { Tier } from "./asset.ts";

/** Public: sheets of every asset, and .pigxel files of free ones. */
export const ASSET_BUCKET = "assets";
/** Private: .pigxel files of paid assets, readable on paid plans only. */
export const PREMIUM_ASSET_BUCKET = "premium-assets";

/** Paid packs ship as premium assets on the Assets page. */
export const isPremium = (tier: Tier) => tier === "paid";

/** Where an asset's .pigxel file lives; its PNG sheet is always public. */
export const fileBucket = (premium: boolean) =>
  premium ? PREMIUM_ASSET_BUCKET : ASSET_BUCKET;
