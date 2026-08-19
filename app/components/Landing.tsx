"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";

const featureCards = [
  { number: "01", title: "Discover", copy: "Know what kind of horror experience awaits." },
  { number: "02", title: "Map", copy: "Community warnings, without story spoilers." },
  { number: "03", title: "Watch", copy: "Sync the movie and let Ghostie guide you." },
];

const appScreens = [
  { src: "/screenshots/discover.png", alt: "ScareSafe discover screen" },
  { src: "/screenshots/movie-detail.png", alt: "ScareSafe movie detail and timeline screen" },
  { src: "/screenshots/jumpscare-alert.png", alt: "ScareSafe incoming jump scare warning" },
];

export default function Landing() {
  const reduceMotion = useReducedMotion();
  return (
    <main className="compact-site" id="top">
      <div className="compact-aurora" aria-hidden="true" />
      <nav className="compact-nav glass" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="ScareSafe home">
          <Image src="/brand/ghostie-icon.png" alt="" width={35} height={35} priority />
          <span>ScareSafe</span>
        </a>
        <div className="compact-nav-note">Spoiler-free horror companion</div>
        <a className="nav-cta" href="#download">App Store</a>
      </nav>

      <section className="compact-stage">
        <motion.div className="compact-copy" initial={reduceMotion ? false : { opacity: 0, x: -28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .75 }}>
          <p className="eyebrow">Horror, on your terms</p>
          <h1>Know the scares<br />before they happen.</h1>
          <p className="compact-lede">ScareSafe prepares you for jumpscares without ruining the movie—so you can enjoy the fear, your way.</p>
          <div className="hero-actions">
            <a className="button primary" id="download" href="mailto:hello@safescare.app?subject=ScareSafe%20App%20Store">Download on the App Store</a>
            <a className="button secondary" href="mailto:hello@safescare.app">Contact</a>
          </div>
          <div className="compact-features" aria-label="How ScareSafe works">
            {featureCards.map((feature) => (
              <article key={feature.title}>
                <span>{feature.number}</span>
                <div><h2>{feature.title}</h2><p>{feature.copy}</p></div>
              </article>
            ))}
          </div>
        </motion.div>

        <motion.div className="compact-visual" initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .85, delay: .08 }}>
          <div className="compact-glow" aria-hidden="true" />
          <Image className="compact-ghostie" src="/brand/ghostie-floating.gif" alt="Ghostie, your friendly ScareSafe guide" width={440} height={330} unoptimized priority />
          <div className="compact-phone" aria-label="ScareSafe movie timeline preview">
            <div className="compact-island" />
            <div className="compact-screen">
              {appScreens.map((screen, index) => (
                <Image
                  key={screen.src}
                  className={`compact-slide compact-slide-${index + 1}`}
                  src={screen.src}
                  alt={screen.alt}
                  fill
                  sizes="(max-width: 560px) 225px, 285px"
                  priority={index === 0}
                />
              ))}
              <div className="compact-slide-dots" aria-hidden="true"><i /><i /><i /></div>
            </div>
          </div>
          <div className="compact-float-card community-float glass"><span>Community powered</span><strong>24k+ scares mapped</strong></div>
          <div className="compact-float-card premium-float glass"><span>ScareSafe Till Dawn</span><strong>Unlock the full experience ✦</strong></div>
        </motion.div>
      </section>

      <footer className="compact-footer">
        <p>Every scare mapped helps another horror fan.</p>
        <div><a href="/privacy">Privacy</a><a href="/terms">Terms</a><span>© {new Date().getFullYear()} ScareSafe</span></div>
      </footer>
    </main>
  );
}
