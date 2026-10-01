import type { StaticImageData } from "next/image";
import coast from "../../../public/art/sunlit-coast.png";
import shrine from "../../../public/art/secret-shrine.png";
import night from "../../../public/art/after-hours.png";
import sittingPig from "../../../public/art/pigxel-mascot-sitting.png";
import readingPig from "../../../public/art/pigxel-mascot-reading.png";
import easel from "../../../public/art/start/blank-canvas.png";
import robot from "../../../public/art/start/generate-ai.png";
import runner from "../../../public/art/start/sprite-animation.png";
import tiles from "../../../public/art/start/tileset.png";
import characters from "../../../public/art/templates/characters.png";
import cozyRooms from "../../../public/art/templates/cozy-rooms.png";
import buildings from "../../../public/art/templates/fantasy-buildings.png";
import buildTileset from "../../../public/art/tutorials/build-tileset.png";
import firstAnimation from "../../../public/art/tutorials/first-animation.png";
import basics from "../../../public/art/tutorials/pixel-art-basics.png";

/**
 * A piece on the landing: full-bleed scenes fill their card, transparent
 * sprites sit on a soft tint. All of them are AI art studies (artwork.md).
 */
export type Art = {
  image: StaticImageData;
  name: string;
  alt: string;
  /** Background for a transparent sprite; scenes have none. */
  tint?: string;
};

export const ART = {
  coast: {
    image: coast,
    name: "Sunlit coast",
    alt: "A pixel-art cottage above a turquoise sea, with peach sunset clouds and a tiny boat.",
  },
  shrine: {
    image: shrine,
    name: "Secret shrine",
    alt: "A lantern-lit pixel-art shrine in an ancient forest, with a jade stream full of koi.",
  },
  night: {
    image: night,
    name: "After hours",
    alt: "A glowing pixel-art rooftop studio overlooking a sprawling blue-hour city.",
  },
  sittingPig: {
    image: sittingPig,
    name: "Pigxel",
    alt: "Pigxel’s pink pixel pig mascot, sitting in a red scarf.",
    tint: "#fde7ec",
  },
  readingPig: {
    image: readingPig,
    name: "Bookworm",
    alt: "The pink pixel pig reading a green book in round glasses.",
    tint: "#fff1dc",
  },
  easel: {
    image: easel,
    name: "Blank canvas",
    alt: "A pixel-art easel with a pastel landscape painting and a jar of brushes.",
    tint: "#efe9ff",
  },
  robot: {
    image: robot,
    name: "Helper bot",
    alt: "A cheerful lavender pixel-art robot waving.",
    tint: "#e6f4ff",
  },
  runner: {
    image: runner,
    name: "Run cycle",
    alt: "A pixel-art girl running, with faded onion-skin frames behind her.",
    tint: "#ffece4",
  },
  tiles: {
    image: tiles,
    name: "Tileset",
    alt: "Pixel-art grass, stone and water tiles beside a tileset sheet.",
    tint: "#e7f6e9",
  },
  characters: {
    image: characters,
    name: "Characters",
    alt: "A pixel-art adventurer in a witch hat, with walking poses, faces and items.",
  },
  cozyRooms: {
    image: cozyRooms,
    name: "Cozy rooms",
    alt: "An isometric pixel-art bedroom with a sleeping cat, bookshelves and plants.",
  },
  buildings: {
    image: buildings,
    name: "Fantasy buildings",
    alt: "An isometric pixel-art stone cottage with a red tiled roof among trees.",
  },
  buildTileset: {
    image: buildTileset,
    name: "Build a tileset",
    alt: "An isometric pixel-art island of grass and stone tiles with a tree, a little bridge and a waterfall.",
  },
  firstAnimation: {
    image: firstAnimation,
    name: "First animation",
    alt: "Four frames of a pixel-art runner on an animation timeline.",
  },
  basics: {
    image: basics,
    name: "Pixel art basics",
    alt: "A pixel-art girl painting a cat at an easel, with the real cat lying beside her.",
  },
} satisfies Record<string, Art>;

const a = ART;

/** The hero wall: six columns, each a different mix so no two rows match. */
export const WALL_COLUMNS: Art[][] = [
  [a.coast, a.robot, a.characters, a.readingPig, a.buildTileset],
  [a.sittingPig, a.cozyRooms, a.firstAnimation, a.tiles, a.night],
  [a.shrine, a.easel, a.basics, a.runner, a.buildings],
  [a.runner, a.night, a.sittingPig, a.characters, a.easel],
  [a.buildings, a.tiles, a.coast, a.robot, a.firstAnimation],
  [a.readingPig, a.basics, a.shrine, a.cozyRooms, a.sittingPig],
];

/** The thumbnails that drift along the bottom of the closing call to action. */
export const STRIP: Art[] = [
  a.sittingPig,
  a.coast,
  a.robot,
  a.cozyRooms,
  a.runner,
  a.shrine,
  a.easel,
  a.characters,
  a.tiles,
  a.night,
];
