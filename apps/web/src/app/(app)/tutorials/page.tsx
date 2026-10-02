import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ScaledPage } from "@/components/scaled-page";
import { TUTORIALS } from "@/lib/tutorials/tutorials";

export const metadata: Metadata = { title: "Tutorials · Pigxel" };

/** Every tutorial: a video to watch and a guide to follow in the editor. */
export default function Tutorials() {
  return (
    <ScaledPage>
      <h1 className="font-display text-4xl tracking-tight">Tutorials</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Watch a short video, then practise in the editor with a guide that
        points at each tool and ticks steps off as you do them.
      </p>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TUTORIALS.map((tutorial) => (
          <li key={tutorial.slug}>
            <Link
              href={`/tutorials/${tutorial.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none"
            >
              <span className="relative block aspect-[3/2] overflow-hidden bg-[#f8dde6]">
                <Image
                  src={tutorial.image}
                  alt=""
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 90vw"
                  className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
                />
                <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
                  {tutorial.level} · {tutorial.minutes} min
                </span>
              </span>
              <span className="flex flex-1 flex-col p-4">
                <span className="font-display text-xl tracking-tight">
                  {tutorial.title}
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
                  {tutorial.summary}
                </span>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-4 text-xs">
                  <span className="rounded-full bg-[#fde8ef] px-2 py-0.5">
                    {tutorial.youtubeId ? "▶ Video" : "Video soon"}
                  </span>
                  <span className="rounded-full bg-[#e9e4f5] px-2 py-0.5">
                    Interactive guide · {tutorial.steps.length} steps
                  </span>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ScaledPage>
  );
}
