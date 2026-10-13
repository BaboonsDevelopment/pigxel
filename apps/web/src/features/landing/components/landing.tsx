import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/ui/brand";
import { PublicHeader } from "@/components/layout/public-header/public-header";
<<<<<<< HEAD
import { LEGAL, LEGAL_LINKS } from "@/features/legal/legal";
import { ART, STRIP, type Art } from "../art";
=======
import { LEGAL_LINKS } from "@/features/legal/legal";
import { CookieSettingsButton } from "@/features/legal/components/cookie-banner";
import { ART, STRIP } from "../art";
>>>>>>> origin/dev
import { ArtWall } from "./art-wall";
import { FeatureTour } from "./feature-tour/feature-tour";
import { WorldsZoom } from "./worlds-zoom/worlds-zoom";
import { HeroCards } from "./hero-cards";
import { HeroSpotlight } from "./hero-spotlight";
import { geistPixel } from "@/lib/fonts/geist";
import { funnelDisplay, funnelSans } from "@/lib/fonts/landing";
import { ICONS, PixelSprite } from "./pixel-art";
import footerClouds from "../../../../public/art/footer/clouds.png";
import footerPig from "../../../../public/art/footer/pig.png";
import styles from "./landing.module.css";

/** Footer sparkles: x and y in % of the scene, and size in px. */
const SPARKS: [number, number, number][] = [
  [14, 22, 14],
  [22, 58, 10],
  [37, 8, 12],
  [55, 4, 10],
  [63, 30, 14],
  [72, 62, 9],
  [86, 12, 12],
  [93, 46, 10],
];

const delay = (seconds: number) =>
  ({ "--delay": `${seconds}s` }) as CSSProperties;

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/**
 * Splits words into letters that rise and inflate, from the font's thinnest
 * weight to its boldest, one after another. Words stay unbroken.
 */
function Letters({ text, start }: { text: string; start: number }) {
  let index = 0;
  return text.split(" ").map((word, w) => (
    <span key={w}>
      {w > 0 && " "}
      <span className={styles.word}>
        {[...word].map((char) => {
          const i = index++;
          return (
            <span
              key={i}
              className={styles.char}
              style={{ "--i": i, "--start": `${start}s` } as CSSProperties}
            >
              {char}
            </span>
          );
        })}
      </span>
    </span>
  ));
}

/** Pixels of the hero's grid that light up now and then: column, row, ink. */
const CELLS: { x: number; y: number; c: string; d: number; o: number }[] = [
  { x: -12, y: 2, c: "var(--pink-bright)", d: 0.4, o: 0.5 },
  { x: -10, y: 6, c: "var(--blue)", d: 2.6, o: 0.22 },
  { x: -13, y: 9, c: "#ffb36b", d: 4.8, o: 0.45 },
  { x: 11, y: 3, c: "#ffb36b", d: 1.4, o: 0.45 },
  { x: 13, y: 7, c: "var(--pink-bright)", d: 3.6, o: 0.4 },
  { x: 10, y: 11, c: "var(--blue)", d: 5.6, o: 0.2 },
  { x: -7, y: 13, c: "var(--pink-bright)", d: 6.2, o: 0.3 },
  { x: 7, y: 14, c: "#ffb36b", d: 0.9, o: 0.35 },
];

const MAKES: { icon: keyof typeof ICONS; label: string }[] = [
  { icon: "heart", label: "Characters" },
  { icon: "tree", label: "Tilesets" },
  { icon: "house", label: "Cozy rooms" },
  { icon: "sword", label: "Game sprites" },
  { icon: "film", label: "Looping GIFs" },
  { icon: "star", label: "Icons" },
  { icon: "potion", label: "Items & props" },
  { icon: "coin", label: "UI & HUD" },
  { icon: "cat", label: "Tiny pets" },
];

const FAQ = [
  {
    question: "Is Pigxel free?",
    answer:
      "Yes. Every drawing tool, layers, frames and export are free, with 5 arts in Pigxel cloud and unlimited saving to Google Drive. Paid plans add the AI helper, more room in Pigxel cloud, and premium assets and tutorials.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. Pigxel runs in your browser, so you can sign up and start drawing straight away.",
  },
  {
    question: "Where is my art saved?",
    answer:
      "In Pigxel cloud by default, or in your own Google Drive, where every change saves itself. You can also keep a tile in your browser and download it as a .pigxel file.",
  },
  {
    question: "How does Pigxel use my Google account?",
    answer:
      "You can sign in to Pigxel with Google; we use your name, email and profile picture to create your account. If you choose to save to Google Drive, Pigxel can only see the files it creates or that you open with it, never the rest of your Drive. See the Privacy Policy for details.",
  },
  {
    question: "What can I export?",
    answer:
      "PNG and JPEG pictures with crisp, sharp pixels; looping GIF, animated PNG and WebP; PNG sequences; sprite sheets and slices, optionally with a JSON file in Aseprite’s format that game engines read; and a timelapse video of how you drew it.",
  },

  {
    question: "What happens to my art if I stop paying?",
    answer:
      "It stays yours. You keep every tile and can still open, edit and export it on the Free plan.",
  },
];

export function Landing() {
  return (
    <div
      className={`${funnelDisplay.variable} ${funnelSans.variable} ${geistPixel.variable} ${styles.page}`}
    >
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <PublicHeader />

      <main id="main">
        <section
          className={styles.hero}
          aria-labelledby="hero-heading"
          data-header-reveal
        >
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroGrid} aria-hidden="true" />
          <div className={styles.heroCells} aria-hidden="true">
            {CELLS.map((cell, index) => (
              <i
                key={index}
                style={
                  {
                    "--x": cell.x,
                    "--y": cell.y,
                    "--c": cell.c,
                    "--d": `${cell.d}s`,
                    "--o": cell.o,
                  } as CSSProperties
                }
              />
            ))}
          </div>
          <HeroSpotlight />
          <HeroCards />

          <a
            href="#features"
            className={`${styles.badge} ${styles.rise}`}
            style={delay(0.1)}
          >
            <span className={styles.badgeTag}>New</span>
            Animate and export GIFs
            <Arrow />
          </a>
          <h1 id="hero-heading" className={styles.heroTitle}>
            <span className="sr-only">
              Pigxel Studio: Small pixels. Wild imagination.
            </span>
            <span className={styles.heroLine} aria-hidden="true">
              <Letters text="Small pixels." start={0.25} />
            </span>
            <span className={styles.heroLine} aria-hidden="true">
              <Letters text="Wild" start={0.55} />{" "}
              {/* The word is selected, like in the editor. */}
              <span className={styles.selection}>
                <Letters text="imagination." start={0.68} />
                <span className={styles.selectionBox}>
                  <svg>
                    <rect width="100%" height="100%" rx="6" />
                  </svg>
                  <i data-corner="tl" />
                  <i data-corner="tr" />
                  <i data-corner="bl" />
                  <i data-corner="br" />
                </span>
                <span className={styles.cursor}>
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M4 2.8 19.2 13l-6.9 1.5-3.6 6.7Z"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span>you</span>
                </span>
              </span>
            </span>
          </h1>
          <p
            className={`${styles.heroText} ${styles.rise}`}
            style={delay(1.15)}
          >
            Draw, animate and build little worlds, right in your browser.
          </p>
          <div
            className={`${styles.heroActions} ${styles.rise}`}
            style={delay(1.28)}
          >
            <Link
              href="/login?mode=signup"
              className={`${styles.button} ${styles.buttonDark}`}
            >
              Start creating — it’s free
            </Link>
            <Link
              href="/pricing"
              className={`${styles.button} ${styles.buttonLight}`}
            >
              See plans <Arrow />
            </Link>
          </div>
        </section>

        <ArtWall />

        <section className={styles.strip} aria-labelledby="strip-heading">
          <p id="strip-heading">From the first doodle to finished game art</p>
          <div className={styles.marquee}>
            <ul className={styles.marqueeTrack}>
              {[...MAKES, ...MAKES].map((item, index) => (
                <li
                  key={index}
                  aria-hidden={index >= MAKES.length || undefined}
                >
                  <PixelSprite
                    {...ICONS[item.icon]}
                    className={styles.makeIcon}
                  />
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="features"
          className={styles.features}
          aria-labelledby="features-heading"
        >
          <div
            className={`${styles.sectionHead} ${styles.sectionHeadCenter} ${styles.reveal}`}
          >
            <p className={styles.eyebrow}>Features</p>
            <h2 id="features-heading">
              Everything you need.{" "}
              <span className={styles.muted}>Nothing you don’t.</span>
            </h2>
            <p>
              Serious tools with a playful soul, from the very first pixel to
              the final GIF.
            </p>
          </div>
          <FeatureTour />
        </section>

        <section className={styles.worlds} aria-labelledby="worlds-heading">
          <WorldsZoom
            header={
              <div className={`${styles.sectionHeadRow} ${styles.worldsHead}`}>
                <div className={styles.sectionHead}>
                  <p className={styles.eyebrow}>Inspiration</p>
                  <h2 id="worlds-heading">
                    A few pixels.{" "}
                    <span className={styles.worldsFill}>
                      Whole other worlds.
                    </span>
                  </h2>
                  <p>
                    Little places to get lost in. Browse what people publish in
                    Explore, then go make your own.
                  </p>
                </div>
                <Link
                  href="/explore"
                  className={`${styles.button} ${styles.buttonLight}`}
                >
                  Browse Explore <Arrow />
                </Link>
              </div>
            }
          />
        </section>

        <section
          id="faq"
          className={`${styles.section} ${styles.faq}`}
          aria-labelledby="faq-heading"
        >
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
            <p className={styles.eyebrow}>FAQ</p>
            <h2 id="faq-heading">
              Questions? <span className={styles.muted}>Answers.</span>
            </h2>
            <p>
              Anything else?{" "}
              <Link href="/pricing" className={styles.textLink}>
                See plans and pricing
              </Link>
              .
            </p>
          </div>
          <div className={styles.faqList}>
            {FAQ.map((item) => (
              <details
                key={item.question}
                name="faq"
                className={styles.faqItem}
              >
                <summary>
                  {item.question}
                  <span className={styles.faqIcon} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={styles.cta} aria-labelledby="cta-heading">
          <div className={styles.ctaPanel}>
            <div className={styles.ctaPixels} aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <i key={index} />
              ))}
            </div>
            <Image
              src={ART.sittingPig.image}
              alt=""
              sizes="140px"
              className={styles.ctaPig}
            />
            <p className={styles.eyebrow}>No big plan required</p>
            <h2 id="cta-heading">Make a little something.</h2>
            <p className={styles.ctaText}>
              A tiny world. A silly character. Something only you could make.
            </p>
            <div className={styles.heroActions}>
              <Link
                href="/login?mode=signup"
                className={`${styles.button} ${styles.buttonWhite}`}
              >
                Start creating — it’s free
              </Link>
              <Link
                href="/pricing"
                className={`${styles.button} ${styles.buttonGhost}`}
              >
                See plans <Arrow />
              </Link>
            </div>
            <div className={styles.ctaStrip} aria-hidden="true">
              <div className={styles.ctaStripTrack}>
                {[...STRIP, ...STRIP].map((art, index) => (
                  <div
                    key={index}
                    className={styles.ctaThumb}
                    style={{ backgroundColor: art.tint ?? "#fff" }}
                    data-sprite={Boolean(art.tint)}
                  >
                    <Image src={art.image} alt="" sizes="150px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Brand />
            <p className={styles.footerTagline}>Little pixels, big ideas.</p>
            <p>Create, explore and share pixel art.</p>
          </div>
          <nav aria-label="Product" className={styles.footerColumn}>
            <h3>Product</h3>
            <Link href="/explore">Explore</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login?mode=signup">Sign up</Link>
            <Link href="/login">Log in</Link>
          </nav>
          <nav aria-label="Support" className={styles.footerColumn}>
            <h3>Support</h3>
            <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
          </nav>
          <nav aria-label="Policies" className={styles.footerColumn}>
            <h3>Legal</h3>
            {LEGAL_LINKS.filter((link) => link.href !== "/pricing").map(
              (link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ),
            )}
            <CookieSettingsButton className={styles.footerButton} />
          </nav>
        </div>
        <div className={styles.footerScene} aria-hidden="true">
          <Image
            src={footerClouds}
            alt=""
            sizes="(max-width: 640px) 40vw, 280px"
            className={styles.footerClouds}
          />
          <p className={styles.wordmark}>
            {"PIGXEL".split("").map((letter, i) => (
              <span key={i} style={{ "--i": i } as CSSProperties}>
                {letter}
              </span>
            ))}
          </p>
          <Image
            src={footerPig}
            alt=""
            sizes="(max-width: 640px) 34vw, 240px"
            className={styles.footerPig}
          />
          {SPARKS.map(([x, y, size], i) => (
            <i
              key={i}
              className={styles.spark}
              style={
                {
                  left: `${x}%`,
                  top: `${y}%`,
                  "--size": `${size}px`,
                  "--d": `${(i * 0.37) % 2.4}s`,
                } as CSSProperties
              }
            />
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Pigxel Studio</span>
        </div>
      </footer>
    </div>
  );
}
