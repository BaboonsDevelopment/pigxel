import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { Badge } from "@pigxel/ui/components/badge";
import { Text } from "@pigxel/ui/components/typography";
import { cn } from "@pigxel/ui/lib/utils";
import blankCanvas from "../../../public/art/start/blank-canvas.png";
import generateAi from "../../../public/art/start/generate-ai.png";
import spriteAnimation from "../../../public/art/start/sprite-animation.png";
import tileset from "../../../public/art/start/tileset.png";

type Start = {
  title: string;
  description: string;
  image: StaticImageData;
  tint: string;
  href?: string;
};

const STARTS: Start[] = [
  {
    title: "Blank canvas",
    description: "Start from scratch",
    image: blankCanvas,
    tint: "bg-pastel-pink",
    href: "/tiles/new",
  },
  {
    title: "Generate with AI",
    description: "Turn ideas into pixel art",
    image: generateAi,
    tint: "bg-pastel-lavender",
  },
  {
    title: "Sprite animation",
    description: "Create and edit animations",
    image: spriteAnimation,
    tint: "bg-pastel-peach",
  },
  {
    title: "Tileset",
    description: "Build custom tilesets",
    image: tileset,
    tint: "bg-pastel-mint",
  },
];

export function StartCreating() {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {STARTS.map((start) => (
        <li key={start.title}>
          <StartCard start={start} />
        </li>
      ))}
    </ul>
  );
}

function StartCard({ start }: { start: Start }) {
  const body = (
    <>
      <Image
        src={start.image}
        alt=""
        sizes="120px"
        className="h-14 w-auto max-w-[70%] object-contain object-left transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:-rotate-2 motion-reduce:transition-none"
      />
      <span className="mt-auto flex items-end justify-between gap-3">
        <span>
          <span className="block text-sm font-semibold">{start.title}</span>
          <Text as="span" size="xs" tone="muted" className="mt-0.5 block">
            {start.description}
          </Text>
        </span>
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/85 shadow-sm transition-transform group-hover:translate-x-0.5"
        >
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none">
            <path
              d="m6 3 5 5-5 5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </span>
    </>
  );
  const className = cn(
    "group relative flex h-[7.25rem] flex-col rounded-2xl p-3 transition",
    start.tint,
  );

  if (start.href)
    return (
      <Link
        href={start.href}
        className={cn(className, "hover:-translate-y-0.5 hover:shadow-md")}
      >
        {body}
      </Link>
    );
  return (
    <div aria-disabled="true" className={cn(className, "cursor-pointer")}>
      <Badge tone="overlay" className="absolute top-3 right-3">
        Soon
      </Badge>
      {body}
    </div>
  );
}
