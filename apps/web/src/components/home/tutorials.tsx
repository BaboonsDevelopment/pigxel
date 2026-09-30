import Image, { type StaticImageData } from "next/image";
import pigReading from "../../../public/art/pigxel-mascot-reading.png";
import buildTileset from "../../../public/art/tutorials/build-tileset.png";
import firstAnimation from "../../../public/art/tutorials/first-animation.png";
import pixelArtBasics from "../../../public/art/tutorials/pixel-art-basics.png";

type Tutorial = {
  title: string;
  minutes: number;
  level: "Beginner" | "Intermediate";
  image: StaticImageData;
};

const TUTORIALS: Tutorial[] = [
  {
    title: "Pixel art basics",
    minutes: 8,
    level: "Beginner",
    image: pixelArtBasics,
  },
  {
    title: "Your first animation",
    minutes: 16,
    level: "Beginner",
    image: firstAnimation,
  },
  {
    title: "Build a tileset",
    minutes: 32,
    level: "Intermediate",
    image: buildTileset,
  },
];

/**
 * Home's "Learn & Tutorials": step-by-step guides, with the mascot reading
 * along. The guides aren't written yet, so the rows only show what is coming.
 * On wide screens the rows share whatever height Home has left.
 */
export function Tutorials() {
  return (
    <section
      aria-labelledby="tutorials-heading"
      className="relative flex min-h-0 flex-col overflow-hidden rounded-3xl bg-[#f8dde6] p-5"
    >
      <div>
        <h2
          id="tutorials-heading"
          className="font-display text-xl tracking-tight"
        >
          Learn &amp; Tutorials
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Step-by-step guides to improve your skills
        </p>
      </div>
      <ul className="relative z-10 mt-3 flex min-h-0 flex-1 flex-col gap-2 sm:mr-40 lg:ml-4">
        {TUTORIALS.map((tutorial) => (
          <li
            key={tutorial.title}
            className="flex h-16 items-center gap-3 rounded-xl bg-card p-1.5 pr-3 shadow-[0_1px_2px_rgb(59_42_51/0.06)] lg:h-auto lg:max-h-16 lg:min-h-10 lg:flex-1"
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
              <span className="block text-xs text-muted-foreground">
                {tutorial.minutes} min <span aria-hidden="true">·</span>{" "}
                {tutorial.level}
              </span>
            </span>
            <span className="rounded-full bg-[#fde8ef] px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground">
              Soon
            </span>
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f8dde6] text-foreground"
            >
              <svg viewBox="0 0 16 16" className="ml-0.5 size-3.5">
                <path d="M4 2.5v11L13 8z" fill="currentColor" />
              </svg>
            </span>
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
