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
import villageArt from "../../../public/art/wall/village.png";
import reefArt from "../../../public/art/wall/reef.png";
import bakeryArt from "../../../public/art/wall/bakery.png";
import spaceArt from "../../../public/art/wall/space.png";
import autumnArt from "../../../public/art/wall/autumn.png";
import oasisArt from "../../../public/art/wall/oasis.png";
import noodlesArt from "../../../public/art/wall/noodles.png";
import skyislandsArt from "../../../public/art/wall/skyislands.png";
import gardenArt from "../../../public/art/wall/garden.png";
import piratesArt from "../../../public/art/wall/pirates.png";
import dragonArt from "../../../public/art/wall/dragon.png";
import frogArt from "../../../public/art/wall/frog.png";
import chestArt from "../../../public/art/wall/chest.png";
import catnautArt from "../../../public/art/wall/catnaut.png";
import potionsArt from "../../../public/art/wall/potions.png";
import knightArt from "../../../public/art/wall/knight.png";
import lighthouseArt from "../../../public/art/wall/lighthouse.png";
import libraryArt from "../../../public/art/wall/library.png";
import farmArt from "../../../public/art/wall/farm.png";
import pumpkinsArt from "../../../public/art/wall/pumpkins.png";
import volcanoArt from "../../../public/art/wall/volcano.png";
import icecaveArt from "../../../public/art/wall/icecave.png";
import foxArt from "../../../public/art/wall/fox.png";
import octopusArt from "../../../public/art/wall/octopus.png";
import mushroomArt from "../../../public/art/wall/mushroom.png";
import owlArt from "../../../public/art/wall/owl.png";
import castleArt from "../../../public/art/wall/castle.png";
import coffeeArt from "../../../public/art/wall/coffee.png";
import treehouseArt from "../../../public/art/wall/treehouse.png";
import trainArt from "../../../public/art/wall/train.png";
import snailArt from "../../../public/art/wall/snail.png";
import pandaArt from "../../../public/art/wall/panda.png";
import rocketArt from "../../../public/art/wall/rocket.png";

export type Art = {
  image: StaticImageData;
  name: string;
  alt: string;
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
  village: {
    image: villageArt,
    name: "Snowy village",
    alt: "A snowy pixel-art mountain village at dusk, with glowing windows and a wooden bridge over a frozen stream.",
  },
  reef: {
    image: reefArt,
    name: "Coral reef",
    alt: "A sunlit pixel-art coral reef with a sea turtle, a school of fish and a half-buried treasure chest.",
  },
  bakery: {
    image: bakeryArt,
    name: "Morning bakery",
    alt: "A cozy pixel-art bakery full of bread and cakes, with a cat asleep on the counter.",
  },
  space: {
    image: spaceArt,
    name: "Space station",
    alt: "A pixel-art space station room with a round window onto a ringed planet and a floating cat.",
  },
  autumn: {
    image: autumnArt,
    name: "Autumn path",
    alt: "A pixel-art autumn forest path with falling leaves, a fox, a signpost and a stone bridge.",
  },
  oasis: {
    image: oasisArt,
    name: "Desert oasis",
    alt: "A pixel-art desert oasis at sunset, with palm trees, a turquoise pool and a camel caravan.",
  },
  noodles: {
    image: noodlesArt,
    name: "Rainy ramen stand",
    alt: "A pixel-art ramen stand on a rainy neon street at night, with a person under an umbrella.",
  },
  skyislands: {
    image: skyislandsArt,
    name: "Sky islands",
    alt: "Pixel-art floating islands with waterfalls, a windmill, little houses and a hot air balloon.",
  },
  garden: {
    image: gardenArt,
    name: "Spring garden",
    alt: "A pixel-art Japanese garden with cherry blossoms, a koi pond, a red bridge and a tea house.",
  },
  pirates: {
    image: piratesArt,
    name: "Pirate ship",
    alt: "A pixel-art pirate ship sailing toward a tropical island with a lighthouse at golden hour.",
  },
  dragon: {
    image: dragonArt,
    name: "Baby dragon",
    alt: "A tiny mint-green pixel-art baby dragon.",
    tint: "#e7f6e9",
  },
  frog: {
    image: frogArt,
    name: "Frog wizard",
    alt: "A pixel-art frog wizard in a starry purple hat with a glowing staff.",
    tint: "#efe9ff",
  },
  chest: {
    image: chestArt,
    name: "Treasure chest",
    alt: "An open pixel-art treasure chest overflowing with coins and gems.",
    tint: "#fff1dc",
  },
  catnaut: {
    image: catnautArt,
    name: "Cat astronaut",
    alt: "A waving pixel-art cat astronaut in a white space suit.",
    tint: "#e6f4ff",
  },
  potions: {
    image: potionsArt,
    name: "Potions",
    alt: "Three pixel-art potion bottles: red, blue and green.",
    tint: "#fde7ec",
  },
  knight: {
    image: knightArt,
    name: "Slime knight",
    alt: "A pink pixel-art slime knight with a helmet, sword and shield.",
    tint: "#ffece4",
  },
  lighthouse: {
    image: lighthouseArt,
    name: "Stormy lighthouse",
    alt: "A pixel-art lighthouse on a cliff on a stormy night, its beam sweeping over crashing waves.",
  },
  library: {
    image: libraryArt,
    name: "Magic library",
    alt: "A cozy pixel-art library tower with spiral bookshelves, floating books and a moonlit window.",
  },
  farm: {
    image: farmArt,
    name: "Sunrise farm",
    alt: "A pixel-art farm at sunrise with a red barn, a windmill, crops and grazing sheep.",
  },
  pumpkins: {
    image: pumpkinsArt,
    name: "Pumpkin night",
    alt: "A pixel-art Halloween village with glowing jack-o-lanterns, friendly ghosts and a big orange moon.",
  },
  volcano: {
    image: volcanoArt,
    name: "Volcano island",
    alt: "A pixel-art volcano island with lava rivers, jungle dinosaurs and pterodactyls at sunset.",
  },
  icecave: {
    image: icecaveArt,
    name: "Ice cave",
    alt: "A glittering pixel-art ice cave with glowing crystals and a penguin explorer holding a lantern.",
  },
  fox: {
    image: foxArt,
    name: "Fox adventurer",
    alt: "A pixel-art fox adventurer with a backpack, scarf and walking stick.",
    tint: "#ffece4",
  },
  octopus: {
    image: octopusArt,
    name: "Octopus chef",
    alt: "A pink pixel-art octopus chef with a chef hat, frying pan and spatula.",
    tint: "#e6f4ff",
  },
  mushroom: {
    image: mushroomArt,
    name: "Mushroom house",
    alt: "A pixel-art mushroom house with a red spotted roof and a round door.",
    tint: "#e7f6e9",
  },
  owl: {
    image: owlArt,
    name: "Sleepy owl",
    alt: "A sleepy round pixel-art owl perched on a leafy branch.",
    tint: "#efe9ff",
  },
  castle: {
    image: castleArt,
    name: "Tiny castle",
    alt: "A tiny pixel-art fairytale castle with blue towers on a grassy hill.",
    tint: "#fff1dc",
  },
  coffee: {
    image: coffeeArt,
    name: "Coffee break",
    alt: "A pixel-art coffee mug with heart-shaped steam and a cookie.",
    tint: "#fde7ec",
  },
  treehouse: {
    image: treehouseArt,
    name: "Treehouse village",
    alt: "A pixel-art treehouse village in a giant forest at dusk, with rope bridges, lanterns and fireflies.",
  },
  train: {
    image: trainArt,
    name: "Mountain railway",
    alt: "A pixel-art steam train crossing a stone viaduct through green mountains beside a waterfall.",
  },
  snail: {
    image: snailArt,
    name: "Snail cottage",
    alt: "A pixel-art snail carrying a tiny cottage as its shell.",
    tint: "#e7f6e9",
  },
  panda: {
    image: pandaArt,
    name: "Sleepy panda",
    alt: "A chubby pixel-art panda hugging a bamboo stalk.",
    tint: "#efe9ff",
  },
  rocket: {
    image: rocketArt,
    name: "Little rocket",
    alt: "A small pixel-art rocket ship with a round window and a puff of flame.",
    tint: "#ffece4",
  },
} satisfies Record<string, Art>;

const a = ART;

/** Every picture appears in exactly one place on the wall. */
export const WALL_COLUMNS: Art[][] = [
  [a.coast, a.dragon, a.library, a.owl, a.volcano, a.readingPig],
  [a.sittingPig, a.reef, a.cozyRooms, a.fox, a.noodles, a.train],
  [a.shrine, a.easel, a.village, a.potions, a.basics, a.castle],
  [a.chest, a.night, a.autumn, a.robot, a.pirates, a.characters],
  [a.space, a.tiles, a.lighthouse, a.frog, a.skyislands, a.coffee],
  [a.garden, a.knight, a.bakery, a.runner, a.icecave, a.mushroom],
  [a.oasis, a.catnaut, a.pumpkins, a.snail, a.firstAnimation, a.farm],
  [a.panda, a.treehouse, a.buildTileset, a.octopus, a.buildings, a.rocket],
];

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
