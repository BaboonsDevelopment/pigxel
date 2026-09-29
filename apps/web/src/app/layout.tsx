import type { Metadata } from "next";
import { Fredoka, Poppins } from "next/font/google";
import "@pigxel/ui/styles/globals.css";

export const metadata: Metadata = {
  title: "Pigxel",
  description: "Pixel art with an AI helper.",
};

// The theme maps these to `font-sans` (Poppins) and `font-display` (Fredoka).
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${fredoka.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
