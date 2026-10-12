import { Funnel_Display, Funnel_Sans } from "next/font/google";

/**
 * The landing page's type: Funnel's display cut for headlines (variable, so
 * the hero can animate its weight) and its text cut to read.
 */
export const funnelDisplay = Funnel_Display({
  subsets: ["latin"],
  variable: "--font-funnel-display",
});

export const funnelSans = Funnel_Sans({
  subsets: ["latin"],
  variable: "--font-funnel-sans",
});
