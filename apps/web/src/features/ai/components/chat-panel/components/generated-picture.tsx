"use client";

import { useEffect, useRef, useState } from "react";
import { PixelImage } from "@/components/ui/pixel-image";
import { transparentPicturePreview } from "@/lib/image/picture-preview";

export function GeneratedPicture({
  source,
  composition,
}: {
  source: string;
  composition?: "sprite" | "scene";
}) {
  const host = useRef<HTMLDivElement>(null);
  const [prepared, setPrepared] = useState<{
    source: string;
    preview: string;
  } | null>(null);
  const scene = composition === "scene";
  useEffect(() => {
    if (scene) return;
    let active = true;
    let started = false;
    const prepare = () => {
      if (started) return;
      started = true;
      void transparentPicturePreview(source)
        .catch(() => source)
        .then((preview) => {
          if (active) setPrepared({ source, preview });
        });
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            (entries) => {
              if (entries.some((entry) => entry.isIntersecting)) {
                prepare();
                observer?.disconnect();
              }
            },
            { rootMargin: "240px" },
          );
    if (observer && host.current) observer.observe(host.current);
    else prepare();
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [source, scene]);
  const preview = scene
    ? source
    : prepared?.source === source
      ? prepared.preview
      : null;
  return (
    <div
      ref={host}
      className={`mt-2 overflow-hidden rounded-md${scene ? "" : " bg-checker"}`}
    >
      {preview ? (
        <PixelImage src={preview} alt="Generated picture" className="w-full" />
      ) : (
        <div
          role="status"
          aria-label="Preparing picture preview"
          className="aspect-square w-full animate-pulse bg-muted"
        />
      )}
    </div>
  );
}
