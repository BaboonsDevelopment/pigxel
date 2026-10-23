import type { NextConfig } from "next";

const config: NextConfig = {
  // End-to-end runs build into their own folder (see playwright.config.ts).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@pigxel/ui"],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Redraws include the current picture, original, and up to three references.
      bodySizeLimit: "12mb",
    },
  },
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs"],
};

export default config;
