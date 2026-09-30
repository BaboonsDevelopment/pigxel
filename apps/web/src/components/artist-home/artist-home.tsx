"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { LEGAL_LINKS } from "@/lib/legal";
import coast from "../../../public/art/sunlit-coast.png";
import forest from "../../../public/art/secret-shrine.png";
import night from "../../../public/art/after-hours.png";
import pig from "../../../public/art/pigxel-mascot.png";
import styles from "./artist-home.module.css";

const artworks = [
  {
    title: "Somewhere, it's always summer.",
    name: "Sunlit coast",
    category: "A little escape",
    image: coast,
    alt: "Pixel art of a flower-covered coastal cottage above a turquoise sea at sunset.",
    colors: ["#1e5660", "#539a9c", "#e7c786", "#e69570", "#b44f43"],
  },
  {
    title: "Take the path less pixelated.",
    name: "Secret shrine",
    category: "A quieter world",
    image: forest,
    alt: "Pixel art of a lantern-lit shrine, ancient forest, and jade stream filled with koi.",
    colors: ["#203e37", "#536d50", "#91a976", "#d5c68f", "#f3ad58"],
  },
  {
    title: "Just one more pixel before bed.",
    name: "After hours",
    category: "A different perspective",
    image: night,
    alt: "Pixel art of a glowing rooftop studio and a cat overlooking a sprawling blue-hour city.",
    colors: ["#263652", "#5c7792", "#9cabb3", "#ed9769", "#f6d5a0"],
  },
];

function subscribeMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerMotion = () => true;

function Arrow({ back = false }: { back?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={styles.arrow}
      style={back ? { transform: "rotate(180deg)" } : undefined}
    >
      <path
        d="M4 12h15m-6-6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArtistHome() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const reducedMotion = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    getServerMotion,
  );
  const running = !paused && !hovered && !focused && !reducedMotion;
  const current = artworks[active]!;

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % artworks.length),
      6000,
    );
    return () => window.clearInterval(timer);
  }, [running, active]);

  function select(index: number) {
    setActive((index + artworks.length) % artworks.length);
  }

  return (
    <div
      className={styles.page}
      data-motion={paused || reducedMotion ? "off" : "on"}
    >
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>
      <header className={styles.header}>
        <Brand />
        <nav aria-label="Main navigation" className={styles.nav}>
          <a href="#gallery">A little inspiration</a>
          <a href="#studio">The studio</a>
        </nav>
        <div className={styles.headerActions}>
          <Link href="/login" className={styles.login}>
            Log in
          </Link>
          <Link href="/login?mode=signup" className={styles.headerCta}>
            Start creating <Arrow />
          </Link>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-heading">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>
              <span className={styles.sparkle} aria-hidden="true">
                ✳
              </span>{" "}
              SMALL PIXELS. WILD IMAGINATION.
            </p>
            <h1 id="hero-heading">
              Little pixels.
              <br /> <span>Big possibilities.</span>
            </h1>
            <p className={styles.description}>
              For the worlds in your head and the details only you notice.
              <br className={styles.desktopBreak} /> A happy little home for
              your pixel obsession.
            </p>
            <div className={styles.ctaRow}>
              <Link href="/login?mode=signup" className={styles.primaryCta}>
                Make your first pixel <Arrow />
              </Link>
              <span className={styles.ctaNote}>
                Made for your browser.
                <br />
                And your imagination.
              </span>
            </div>
          </div>
          <div className={styles.mascotScene}>
            <span className={styles.speech}>
              big ideas? <strong>i’m all ears.</strong>
            </span>
            <span className={styles.pixelOne} aria-hidden="true" />
            <span className={styles.pixelTwo} aria-hidden="true" />
            <Image
              src={pig}
              alt="Pigxel, our chunky pink pixel pig with a curly tail and a very big imagination."
              className={styles.mascot}
              sizes="(max-width: 700px) 240px, 330px"
              preload
            />
            <span className={styles.mascotCaption}>
              <span>pig</span> + pixel = <strong>Pigxel</strong>
              <span className={styles.littleHeart} aria-hidden="true">
                ♥
              </span>
            </span>
          </div>
        </section>

        <section
          id="gallery"
          className={styles.gallery}
          aria-label="Pixel art inspiration"
          aria-roledescription="carousel"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget))
              setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              select(active + (event.key === "ArrowRight" ? 1 : -1));
            }
          }}
        >
          <div className={styles.galleryHeading}>
            <p>
              <span className={styles.liveDot} /> A FEW PIXELS. A WHOLE OTHER
              WORLD.
            </p>
            <span className={styles.galleryHint}>
              A little inspiration for your next big idea{" "}
              <span aria-hidden="true">↘</span>
            </span>
          </div>
          <div
            className={styles.artFrame}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch)
                touchStart.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const touch = event.changedTouches[0];
              const start = touchStart.current;
              if (
                touch &&
                start &&
                Math.abs(touch.clientX - start.x) > 50 &&
                Math.abs(touch.clientX - start.x) >
                  Math.abs(touch.clientY - start.y)
              )
                select(active + (touch.clientX < start.x ? 1 : -1));
              touchStart.current = null;
            }}
          >
            {artworks.map((art, index) => (
              <div
                key={art.name}
                className={styles.slide}
                data-active={index === active}
                aria-hidden={index !== active}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${artworks.length}: ${art.name}`}
              >
                <Image
                  src={art.image}
                  alt={art.alt}
                  fill
                  sizes="(max-width: 700px) 100vw, (max-width: 1400px) 90vw, 1240px"
                  preload={index === 0}
                  loading={index === 0 ? undefined : "eager"}
                  className={styles.artImage}
                />
                <div className={styles.artShade} />
                <div className={styles.artCaption}>
                  <span>{art.category}</span>
                  <h2>{art.title}</h2>
                </div>
              </div>
            ))}
            <span className={styles.artBadge}>
              <span aria-hidden="true">✳</span> THE INSPIRATION SERIES
            </span>
            <div className={styles.artArrows}>
              <button
                type="button"
                onClick={() => select(active - 1)}
                aria-label="Previous artwork"
              >
                <Arrow back />
              </button>
              <button
                type="button"
                onClick={() => select(active + 1)}
                aria-label="Next artwork"
              >
                <Arrow />
              </button>
            </div>
          </div>
          <div className={styles.galleryBar}>
            <div
              className={styles.artMeta}
              aria-live={running ? "off" : "polite"}
              aria-atomic="true"
            >
              <span className={styles.artNumber}>
                0{active + 1}
                <span> / 03</span>
              </span>
              <strong>{current.name}</strong>
              <span className={styles.aiLabel}>AI art study</span>
            </div>
            <div
              className={styles.swatches}
              aria-label={`${current.name} color palette`}
            >
              {current.colors.map((color) => (
                <span key={color} style={{ background: color }} />
              ))}
            </div>
            <div className={styles.galleryControls}>
              {artworks.map((art, index) => (
                <button
                  key={art.name}
                  type="button"
                  className={styles.dotButton}
                  aria-label={`Show ${art.name}`}
                  aria-current={active === index ? "true" : undefined}
                  onClick={() => select(index)}
                >
                  <span />
                </button>
              ))}
              <button
                type="button"
                className={styles.pauseButton}
                disabled={reducedMotion}
                aria-label={
                  reducedMotion
                    ? "Animation disabled by reduced motion preference"
                    : paused
                      ? "Play animations and slideshow"
                      : "Pause animations and slideshow"
                }
                aria-pressed={paused || reducedMotion}
                onClick={() => setPaused(!paused)}
              >
                {paused || reducedMotion ? "▷" : "Ⅱ"}
              </button>
            </div>
          </div>
        </section>

        <section
          id="studio"
          className={styles.studio}
          aria-labelledby="studio-heading"
        >
          <div className={styles.sectionIntro}>
            <p className={styles.eyebrow}>A LITTLE STUDIO. ALL YOURS.</p>
            <h2 id="studio-heading">
              Serious about the craft.
              <br />
              <span>Playful about everything else.</span>
            </h2>
            <p>
              From that first rough silhouette to the hue shift that makes it
              click.
              <br className={styles.desktopBreak} /> A space to slow down, zoom
              in, and make something yours.
            </p>
          </div>
          <div className={styles.features}>
            <article>
              <div className={styles.featureArt} aria-hidden="true">
                <div className={styles.pixelFlower}>
                  <i />
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <span className={styles.canvasLabel}>one pixel at a time.</span>
              </div>
              <span className={styles.featureIndex}>01 / THE CANVAS</span>
              <h3>Small details. Your signature.</h3>
              <p>
                Draw, experiment, and find the right shape. Your next character,
                tile, or tiny world starts with a single pixel.
              </p>
            </article>
            <article>
              <div
                className={`${styles.featureArt} ${styles.paletteArt}`}
                aria-hidden="true"
              >
                <div className={styles.paletteStrip}>
                  {[
                    "#582c4d",
                    "#9a466a",
                    "#e67791",
                    "#ffa7b4",
                    "#ffd1c9",
                    "#ffead8",
                  ].map((color) => (
                    <i key={color} style={{ background: color }} />
                  ))}
                </div>
                <span className={styles.canvasLabel}>
                  find your kind of pink.
                </span>
              </div>
              <span className={styles.featureIndex}>
                02 / THE POSSIBILITIES
              </span>
              <h3>Follow your own weird idea.</h3>
              <p>
                A pig in space? A very small kingdom? Make room for the
                experiments that turn into something unexpected.
              </p>
            </article>
            <article>
              <div
                className={`${styles.featureArt} ${styles.assistantArt}`}
                aria-hidden="true"
              >
                <span className={styles.ideaSpark}>✳</span>
                <span className={styles.ideaBubble}>A little “what if…”</span>
              </div>
              <span className={styles.featureIndex}>
                03 / A HELPING HOOF{" "}
                <span className={styles.soon}>IN THE MAKING</span>
              </span>
              <h3>Your imagination. A little nudge.</h3>
              <p>
                We’re building an AI helper for exploring ideas and getting
                unstuck. You’ll always make the creative calls.
              </p>
            </article>
          </div>
        </section>
        <section className={styles.closing}>
          <span className={styles.closingPixels} aria-hidden="true">
            ✳
          </span>
          <p className={styles.eyebrow}>GO ON. MAKE A LITTLE SOMETHING.</p>
          <h2>
            Your next world
            <br />
            starts with <span>one pixel.</span>
          </h2>
          <Link href="/login?mode=signup" className={styles.primaryCta}>
            Let’s make it <Arrow />
          </Link>
        </section>
      </main>
      <footer className={styles.footer}>
        <Brand />
        <p>A little pig. A lot of possibility.</p>
        <nav aria-label="Policies" className={styles.footerLinks}>
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <span>© {new Date().getFullYear()} Pigxel</span>
        <a href="#main">Back to top ↑</a>
      </footer>
    </div>
  );
}
