import type { Metadata } from "next";
import {
  ContactDetails,
  LegalPage,
  LegalSection,
} from "@/features/legal/components/legal-page";
import {
  FONTS,
  LIBRARIES,
  LICENSE_URLS,
  OFL_URL,
} from "@/features/legal/licenses";
import { PALETTE_PRESETS } from "@/lib/palette/presets";

export const metadata: Metadata = {
  title: "Licenses · Pigxel",
  description:
    "Fonts, open-source libraries and palettes Pigxel uses, with their authors and licenses.",
};

export default function Licenses() {
  const palettes = PALETTE_PRESETS.filter((p) => p.author);
  return (
    <LegalPage
      title="Licenses"
      intro={
        <p>
          Pigxel is built with work by many people. This page credits them and
          names the licenses we use their work under.
        </p>
      }
    >
      <LegalSection title="1. Fonts">
        <p>
          All fonts are licensed under the{" "}
          <a href={OFL_URL} target="_blank" rel="noreferrer">
            SIL Open Font License 1.1
          </a>
          , which allows using them in the app and in art you export with
          Pigxel’s text tool. They are served from Pigxel’s own servers.
        </p>
        <ul>
          {FONTS.map((font) => (
            <li key={font.name}>
              <strong>{font.name}</strong> by {font.designer}
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="2. Open-source software">
        <ul>
          {LIBRARIES.map((lib) => (
            <li key={lib.name}>
              <strong>{lib.name}</strong> by {lib.by},{" "}
              <a
                href={LICENSE_URLS[lib.license]}
                target="_blank"
                rel="noreferrer"
              >
                {lib.license}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Mediabunny’s source code, which we use unmodified, is available at{" "}
          <a
            href="https://github.com/Vanilagy/mediabunny"
            target="_blank"
            rel="noreferrer"
          >
            github.com/Vanilagy/mediabunny
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="3. Palettes">
        <p>
          The palettes in the editor are the work of their authors, credited
          here and in the editor. Many are published on{" "}
          <a
            href="https://lospec.com/palette-list"
            target="_blank"
            rel="noreferrer"
          >
            Lospec
          </a>
          .
        </p>
        <ul>
          {palettes.map((palette) => (
            <li key={palette.id}>
              <strong>{palette.name}</strong> by {palette.author}
            </li>
          ))}
        </ul>
      </LegalSection>

      <LegalSection title="4. Artwork">
        <p>
          The Pigxel mascot and the art on our website were created for Pigxel
          with AI image generation, and are labelled “AI art study” where they
          appear as gallery pieces.
        </p>
      </LegalSection>

      <LegalSection title="5. Contact">
        <p>If we’ve missed a credit or got one wrong, please tell us.</p>
        <ContactDetails />
      </LegalSection>
    </LegalPage>
  );
}
