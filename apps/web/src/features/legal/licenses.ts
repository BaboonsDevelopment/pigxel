/** Third-party work Pigxel ships, for the Licenses page. */

export const OFL_URL = "https://openfontlicense.org";

/** Every font loaded through next/font, all under the SIL Open Font License 1.1. */
export const FONTS: { name: string; designer: string }[] = [
  { name: "DM Mono", designer: "Colophon Foundry" },
  { name: "DotGothic16", designer: "Fontworks Inc." },
  { name: "Fredoka", designer: "Milena Brandão, Hafontia" },
  { name: "Funnel Display", designer: "NORD ID, Kristian Möller" },
  { name: "Funnel Sans", designer: "NORD ID, Kristian Möller" },
  {
    name: "Geist",
    designer:
      "Andrés Briganti, Mateo Zaragoza, Guillermo Rauch, Evil Rabbit, José Rago, Facundo Santana",
  },
  {
    name: "Geist Pixel",
    designer: "Andrés Briganti, Evil Rabbit, Guillermo Rauch",
  },
  { name: "Inter", designer: "Rasmus Andersson" },
  {
    name: "Madimi One",
    designer: "Taurai Valerie Mtake, Mirko Velimirović",
  },
  { name: "Manrope", designer: "Mikhail Sharanda" },
  { name: "Pixelify Sans", designer: "Stefie Justprince" },
  {
    name: "Poppins",
    designer: "Indian Type Foundry, Jonny Pinhorn, Ninad Kale",
  },
  { name: "Press Start 2P", designer: "CodeMan38" },
  { name: "Silkscreen", designer: "Jason Kottke" },
  { name: "Tiny5", designer: "Stefan Schmidt" },
];

/** Libraries that run in the app or on its servers. */
export const LIBRARIES: { name: string; license: string; by: string }[] = [
  { name: "Next.js", license: "MIT", by: "Vercel, Inc." },
  { name: "React and React DOM", license: "MIT", by: "Meta Platforms, Inc." },
  {
    name: "@supabase/supabase-js, @supabase/ssr",
    license: "MIT",
    by: "Supabase, Inc.",
  },
  { name: "@tanstack/react-query", license: "MIT", by: "Tanner Linsley" },
  { name: "TensorFlow.js", license: "Apache-2.0", by: "Google LLC" },
  {
    name: "NSFWJS and its MobileNetV2 model",
    license: "MIT",
    by: "Infinite Red, Inc.",
  },
  { name: "Mediabunny", license: "MPL-2.0", by: "Vanilagy" },
  { name: "fflate", license: "MIT", by: "Arjun Barrett" },
];

export const LICENSE_URLS: Record<string, string> = {
  MIT: "https://opensource.org/license/mit",
  "Apache-2.0": "https://www.apache.org/licenses/LICENSE-2.0",
  "MPL-2.0": "https://www.mozilla.org/MPL/2.0/",
};
