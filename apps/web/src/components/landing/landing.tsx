import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Brand } from "@/components/brand";
import { PublicHeader } from "@/components/public-header/public-header";
import { LEGAL_LINKS } from "@/lib/legal";
import { ART, STRIP, type Art } from "./art";
import { ArtWall } from "./art-wall";
import { CountUp } from "./count-up";
import { AiDemo, AnimateDemo, ExportDemo } from "./demos";
import { FeatureTabs } from "./feature-tabs";
import { geist, geistPixel } from "@/lib/fonts";
import { ICONS, PixelSprite } from "./pixel-art";
import { PixelPlayground } from "./pixel-playground";
import styles from "./landing.module.css";

const delay = (seconds: number) =>
  ({ "--delay": `${seconds}s` }) as CSSProperties;

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
    </svg>
  );
}

function Words({ text, start }: { text: string; start: number }) {
  return text.split(" ").map((word, index) => (
    <span key={index}>
      {index > 0 && " "}
      <span className={styles.word} style={delay(start + index * 0.08)}>
        {word}
      </span>
    </span>
  ));
}

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

const FEATURES = [
  {
    id: "draw",
    title: "Draw",
    text: "Pens, shapes, selections, shading and dither, with layers, palettes, mirror drawing and tiled mode. Try it right here.",
    panel: <PixelPlayground />,
  },
  {
    id: "animate",
    title: "Animate",
    text: "Add frames, set their timing and turn on onion skin. Watch a tiny character come alive.",
    panel: <AnimateDemo />,
  },
  {
    id: "ai",
    title: "Ask the AI helper",
    text: "Describe a change in plain words, and the helper edits your pixels for you.",
    panel: <AiDemo />,
  },
  {
    id: "export",
    title: "Export anywhere",
    text: "PNG and JPEG up to 20× with sharp pixels, looping GIFs, and sprite sheets with Aseprite JSON for game engines.",
    panel: <ExportDemo />,
  },
];

const BENTO: { art: Art; size: "large" | "wide" | "small" }[] = [
  { art: ART.coast, size: "large" },
  { art: ART.shrine, size: "wide" },
  { art: ART.night, size: "small" },
  { art: ART.cozyRooms, size: "small" },
];

const FAQ = [
  {
    question: "Is Pigxel free?",
    answer:
      "Yes. Every drawing tool, layers, frames and export are free, with a few AI generations to try it out. Paid plans add more AI and more room in Pigxel cloud.",
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
    question: "What can I export?",
    answer:
      "PNG and JPEG pictures scaled up to 20× with sharp pixels, looping GIFs of every frame, and sprite sheets, optionally with a JSON file in Aseprite’s format that game engines read.",
  },
  {
    question: "How big can a canvas be?",
    answer:
      "Up to 256 × 256 pixels, on a transparent, white or black background.",
  },
  {
    question: "What happens to my art if I stop paying?",
    answer:
      "It stays yours. You keep every tile and can still open, edit and export it on the Free plan.",
  },
];

export function Landing() {
  return (
    <div className={`${geist.variable} ${geistPixel.variable} ${styles.page}`}>
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
          <a
            href="#features"
            className={`${styles.badge} ${styles.rise}`}
            style={delay(0)}
          >
            <span className={styles.badgeTag}>New</span>
            Animate frame by frame, export GIFs
            <Arrow />
          </a>
          <h1 id="hero-heading" className={styles.heroTitle}>
            <span className={styles.heroLine}>
              <Words text="Small pixels." start={0.1} />
            </span>
            <span className={`${styles.heroLine} ${styles.muted}`}>
              <Words text="Wild imagination." start={0.26} />
            </span>
          </h1>
          <p className={`${styles.heroText} ${styles.rise}`} style={delay(0.5)}>
            Make pixel art, animate tiny characters and build little worlds. A
            whole creative studio, right in your browser.
          </p>
          <div
            className={`${styles.heroActions} ${styles.rise}`}
            style={delay(0.6)}
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
          <ul className={`${styles.perks} ${styles.rise}`} style={delay(0.7)}>
            <li>
              <Check /> No downloads
            </li>
            <li>
              <Check /> Free plan, forever
            </li>
            <li>
              <Check /> Pigxel cloud or Google Drive
            </li>
          </ul>
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
          className={styles.section}
          aria-labelledby="features-heading"
        >
          <div className={`${styles.sectionHead} ${styles.reveal}`}>
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
          <FeatureTabs features={FEATURES} />
        </section>

        <section className={styles.stats} aria-label="Pigxel in numbers">
          <div className={`${styles.stat} ${styles.reveal}`}>
            <strong>
              <CountUp from={16} to={256} />
              <span className={styles.times}>×</span>
              <CountUp from={16} to={256} />
            </strong>
            <p>The biggest canvas, in pixels</p>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <strong>
              <CountUp from={1} to={20} />
              <span className={styles.times}>×</span>
            </strong>
            <p>Export scale, with every pixel kept sharp</p>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <strong>
              <CountUp to={4} />
            </strong>
            <p>Ways out: PNG, JPEG, GIF and sprite sheets</p>
          </div>
          <div className={`${styles.stat} ${styles.reveal}`}>
            <strong>0</strong>
            <p>Things to install. It all runs in your browser</p>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="worlds-heading">
          <div className={`${styles.sectionHeadRow} ${styles.reveal}`}>
            <div className={styles.sectionHead}>
              <p className={styles.eyebrow}>Inspiration</p>
              <h2 id="worlds-heading">
                A few pixels.{" "}
                <span className={styles.muted}>Whole other worlds.</span>
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
          <div className={styles.bento}>
            {BENTO.map(({ art, size }) => (
              <figure
                key={art.name}
                className={`${styles.bentoItem} ${styles.reveal}`}
                data-size={size}
              >
                <Image
                  src={art.image}
                  alt={art.alt}
                  sizes={
                    size === "large"
                      ? "(max-width: 768px) 100vw, 600px"
                      : "(max-width: 768px) 50vw, 300px"
                  }
                />
                <figcaption>
                  <strong>{art.name}</strong>
                  <span>AI art study</span>
                </figcaption>
              </figure>
            ))}
          </div>
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
            <p>A little pig. A lot of possibility.</p>
          </div>
          <nav aria-label="Product" className={styles.footerColumn}>
            <h3>Product</h3>
            <Link href="/explore">Explore</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login?mode=signup">Sign up</Link>
            <Link href="/login">Log in</Link>
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
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Pigxel</span>
          <span>Small pixels. Big heart.</span>
        </div>
        <p className={styles.wordmark} aria-hidden="true">
          pigxel
        </p>
      </footer>
    </div>
  );
}
