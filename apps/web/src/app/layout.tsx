import type { Metadata } from "next";
import "@pigxel/ui/styles/globals.css";

export const metadata: Metadata = {
  title: "Pigxel",
  description: "Pixel art with an AI helper.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
