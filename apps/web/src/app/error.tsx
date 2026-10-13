"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonVariants } from "@pigxel/ui/components/button";
import { Heading, Text } from "@pigxel/ui/components/typography";
import { BrandMascot } from "@/components/ui/brand";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-6 py-16 text-center">
      <BrandMascot
        priority
        className="h-auto w-40 [image-rendering:pixelated]"
      />
      <Heading size="page" as="h1" className="mt-6">
        Something went wrong
      </Heading>
      <Text size="md" tone="muted" className="mt-3 max-w-md">
        This page hit an error. Your saved work is safe. Try again, and if it
        keeps happening, tell us what you were doing.
      </Text>
      {error.digest && (
        <Text size="xs" tone="muted" className="mt-3 font-mono">
          Error code: {error.digest}
        </Text>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <Link
          href="/"
          className={buttonVariants({ size: "lg", variant: "secondary" })}
        >
          Go to Pigxel
        </Link>
      </div>
    </main>
  );
}
