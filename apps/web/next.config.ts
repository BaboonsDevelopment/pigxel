import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@pigxel/ui"],
  poweredByHeader: false,
  serverExternalPackages: ["@tensorflow/tfjs", "nsfwjs"],
};

export default config;
