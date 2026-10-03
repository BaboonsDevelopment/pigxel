import Image, { type StaticImageData } from "next/image";
import { Badge } from "@pigxel/ui/components/badge";
import { cardVariants } from "@pigxel/ui/components/card";
import { Heading, Text } from "@pigxel/ui/components/typography";
import characters from "../../../public/art/templates/characters.png";
import cozyRooms from "../../../public/art/templates/cozy-rooms.png";
import fantasyBuildings from "../../../public/art/templates/fantasy-buildings.png";

type Template = { name: string; image: StaticImageData; alt: string };

const TEMPLATES: Template[] = [
  {
    name: "Cozy rooms",
    image: cozyRooms,
    alt: "An isometric pixel-art bedroom with a sleeping cat, bookshelves and plants.",
  },
  {
    name: "Characters",
    image: characters,
    alt: "A pixel-art adventurer in a witch hat, with walking poses, faces and items.",
  },
  {
    name: "Fantasy buildings",
    image: fantasyBuildings,
    alt: "An isometric pixel-art stone cottage with a red tiled roof among trees.",
  },
];

export function PopularTemplates() {
  return (
    <section
      aria-labelledby="templates-heading"
      className={cardVariants({
        tone: "lavender",
        className: "flex min-h-0 flex-col rounded-3xl",
      })}
    >
      <div>
        <Heading id="templates-heading">Popular templates</Heading>
        <Text tone="muted" className="mt-0.5">
          Ready-to-use starting points
        </Text>
      </div>
      <ul className="mt-3 grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
        {TEMPLATES.map((template) => (
          <li
            key={template.name}
            className="group relative flex min-h-0 flex-col overflow-hidden rounded-xl bg-card shadow-[0_1px_2px_rgb(59_42_51/0.06)]"
          >
            <span className="relative block aspect-[16/10] overflow-hidden lg:aspect-auto lg:min-h-0 lg:flex-1">
              <Image
                src={template.image}
                alt={template.alt}
                sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 90vw"
                className="absolute inset-0 size-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none"
              />
            </span>
            <Badge tone="overlay" className="absolute top-2.5 right-2.5">
              Soon
            </Badge>
            <span className="block shrink-0 truncate px-3 py-2 font-mono text-sm">
              {template.name}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
