import type { Metadata } from "next";
import { DM_Mono, Fredoka, Poppins } from "next/font/google";
import "@pigxel/ui/styles/globals.css";

export const metadata: Metadata = {
  title: "Pigxel",
  description: "Pixel art with an AI helper.",
};

// The theme maps these to `font-sans` (Poppins), `font-display` (Fredoka)
// and `font-mono` (DM Mono, for project names and small labels).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-poppins",
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
      className={`${poppins.variable} ${fredoka.variable} ${dmMono.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
