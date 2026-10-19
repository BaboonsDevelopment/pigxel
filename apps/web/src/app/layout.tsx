import type { Metadata } from "next";
import { DM_Mono, Fredoka, Manrope } from "next/font/google";
import "@pigxel/ui/styles/globals.css";
import "./transitions.css";
import { ConnectionWatch } from "@/components/layout/connection-watch";
import { NavigationHistory } from "@/components/navigation/back-button";
import { QueryProvider } from "@/components/providers/query-provider";
import { CookieBanner } from "@/features/legal/components/cookie-banner";
import { madimiOne } from "@/lib/fonts/madimi";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: "Pigxel",
  description: "Pixel art with an AI helper.",
};

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
});
const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["600"],
  variable: "--font-fredoka",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${madimiOne.variable} ${fredoka.variable} ${dmMono.variable}`}
    >
      <body className="min-h-screen" suppressHydrationWarning>
        <QueryProvider>
          <NavigationHistory />
          {children}
        </QueryProvider>
        <ConnectionWatch />
        <CookieBanner />
      </body>
    </html>
  );
}
