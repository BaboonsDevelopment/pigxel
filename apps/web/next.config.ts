import type { NextConfig } from "next";

const config: NextConfig = {
  // End-to-end runs build into their own folder (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@pigxel/ui"],
  poweredByHeader: false,
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs"],
};

export default config;
