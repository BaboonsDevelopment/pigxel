import Image from "next/image";
import Link from "next/link";
import { cardVariants } from "@pigxel/ui/components/card";
import { Heading, linkVariants, Text } from "@pigxel/ui/components/typography";
import { TUTORIALS } from "@/lib/tutorials/tutorials";
import pigReading from "../../../public/art/pigxel-mascot-reading.png";

export function Tutorials() {
  return (
    <section
      aria-labelledby="tutorials-heading"
      className={cardVariants({
        tone: "pink",
        className: "relative flex min-h-0 flex-col overflow-hidden rounded-3xl",
      })}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading id="tutorials-heading">Learn &amp; Tutorials</Heading>
          <Text tone="muted" className="mt-0.5">
            Step-by-step guides to improve your skills
          </Text>
        </div>
        <Link
          href="/tutorials"
          className={linkVariants({
            variant: "accent",
            className: "relative z-10",
          })}
        >
          View all <span aria-hidden="true">→</span>
        </Link>
      </div>
      <ul className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col gap-2 sm:mr-40 lg:ml-4">
        {TUTORIALS.map((tutorial) => (
          <li
            key={tutorial.slug}
            className="flex h-16 lg:h-auto lg:max-h-16 lg:min-h-10 lg:flex-1"
          >
            <Link
              href={`/tutorials/${tutorial.slug}`}
              className="group flex w-full items-center gap-3 rounded-xl bg-card p-1.5 pr-3 shadow-[0_1px_2px_rgb(59_42_51/0.06)] transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none"
            >
              <Image
                src={tutorial.image}
                alt=""
                sizes="112px"
                className="aspect-[3/2] h-full w-auto shrink-0 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-display text-base">
                  {tutorial.title}
                </span>
                <Text as="span" size="xs" tone="muted" className="block">
                  {tutorial.minutes} min <span aria-hidden="true">·</span>{" "}
                  {tutorial.level}
                </Text>
              </span>
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pastel-pink text-foreground transition-transform group-hover:scale-110 motion-reduce:transition-none"
              >
                <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5">
                  <path d="M4 2.5v11L13 8z" fill="currentColor" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Image
        src={pigReading}
        alt=""
        sizes="160px"
        className="pointer-events-none absolute right-3 bottom-2 hidden w-36 [image-rendering:pixelated] sm:block"
      />
    </section>
  );
}
