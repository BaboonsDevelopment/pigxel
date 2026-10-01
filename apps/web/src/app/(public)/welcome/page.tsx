import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@pigxel/ui/components/button";

export const metadata: Metadata = {
  title: "Welcome · Pigxel",
  robots: { index: false },
};

/** Where Paddle Checkout sends people after a successful payment. */
export default function Welcome() {
  return (
    <main className="mx-auto w-full max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
        Thanks for subscribing
      </h1>
      <p className="mt-4 text-muted-foreground">
        Your payment went through, and Paddle is emailing your receipt.
      </p>
      <Link
        href="/home"
        className={buttonVariants({ size: "lg", className: "mt-8" })}
      >
        Start creating
      </Link>
    </main>
  );
}
