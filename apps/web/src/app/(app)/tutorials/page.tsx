import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@pigxel/ui/components/badge";
import { cardVariants } from "@pigxel/ui/components/card";
import { Heading, PageHeader, Text } from "@pigxel/ui/components/typography";
import { ScaledPage } from "@/components/layout/scaled-page";
import { TUTORIALS } from "@/features/tutorials/tutorials";

export const metadata: Metadata = { title: "Tutorials · Pigxel" };

export default function Tutorials() {
  return (
    <ScaledPage>
      <PageHeader
        title="Tutorials"
        description="Watch a short video, then practise in the editor with a guide that points at each tool and ticks steps off as you do them."
      />
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {TUTORIALS.map((tutorial) => (
          <li key={tutorial.slug}>
            <Link
              href={`/tutorials/${tutorial.slug}`}
              className={cardVariants({
                padding: "none",
                className:
                  "group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
              })}
            >
              <span className="relative block aspect-[3/2] overflow-hidden bg-pastel-pink">
                <Image
                  src={tutorial.image}
                  alt=""
                  sizes="(min-width: 1024px) 400px, (min-width: 640px) 45vw, 90vw"
                  className="size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
                />
                <Badge tone="overlay" className="absolute top-3 left-3">
                  {tutorial.level} · {tutorial.minutes} min
                </Badge>
              </span>
              <span className="flex flex-1 flex-col p-4">
                <Heading as="span">{tutorial.title}</Heading>
                <Text as="span" tone="muted" className="mt-1">
                  {tutorial.summary}
                </Text>
                <span className="mt-auto flex flex-wrap gap-1.5 pt-4">
                  <Badge tone="pink" size="md">
                    {tutorial.youtubeId ? "▶ Video" : "Video soon"}
                  </Badge>
                  <Badge tone="lavender" size="md">
                    Interactive guide · {tutorial.steps.length} steps
                  </Badge>
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </ScaledPage>
  );
}
