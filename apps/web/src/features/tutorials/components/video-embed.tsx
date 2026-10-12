"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@pigxel/ui/components/button";
import { saveCookieChoice, useCookieChoice } from "@/features/legal/consent";

/**
 * A YouTube player that loads only after consent: nothing reaches YouTube
 * until people allow videos, or choose to load this one.
 */
export function VideoEmbed({ src, title }: { src: string; title: string }) {
  const choice = useCookieChoice();
  const [once, setOnce] = useState(false);
  if (choice?.media || once)
    return (
      <iframe
        src={src}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className="aspect-video w-full rounded-2xl border bg-black"
      />
    );
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl border bg-pastel-lavender p-6 text-center">
      <p className="max-w-sm text-sm">
        This video plays from YouTube, which may set cookies and see your IP
        address.{" "}
        <Link href="/cookies" className="underline underline-offset-2">
          Cookie Policy
        </Link>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => setOnce(true)} aria-label={`Play ${title}`}>
          Play video
        </Button>
        <Button
          variant="secondary"
          onClick={() => saveCookieChoice({ media: true })}
        >
          Always allow videos
        </Button>
      </div>
    </div>
  );
}
