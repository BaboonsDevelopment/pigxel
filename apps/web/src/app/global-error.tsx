"use client";

import { useEffect } from "react";
import "@pigxel/ui/styles/globals.css";

/** Replaces the root layout when it fails, so it brings its own html and styles. */
export default function GlobalError({
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
    <html lang="en">
      <body className="min-h-screen bg-canvas text-foreground">
        <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center font-sans">
          <h1 className="text-3xl font-semibold">Pigxel couldn’t load</h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Something went wrong on our side. Your saved work is safe. Try again
            in a moment.
          </p>
          {error.digest && (
            <p className="mt-3 font-mono text-xs text-muted-foreground">
              Error code: {error.digest}
            </p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground hover:bg-primary-hover"
            >
              Try again
            </button>
            {/* A plain link: the app's router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="rounded-xl border px-5 py-2.5 font-semibold hover:bg-secondary"
            >
              Go to Pigxel
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
