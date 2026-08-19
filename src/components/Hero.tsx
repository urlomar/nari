// src/components/Hero.tsx
import { lazy, Suspense } from "react";
import { motion, type Variants } from "motion/react";
import { Link } from "react-router-dom";
import s from "../styles/Hero.module.css";
import cubeStyles from "./Cube.module.css";
import { GradientRibbon } from "./GradientRibbon";
import { Typewriter } from "./Typewriter";
import { fadeUp, clipReveal } from "@/styles/motionVariants";
import { track } from "@/lib/analytics";

// Lazy: three.js + @react-three/fiber + drei add real weight (~230kB
// gzipped) that shouldn't block the landing page's first paint just
// because the cube happens to be above the fold — it streams in after.
const Cube = lazy(() => import("./Cube").then((m) => ({ default: m.Cube })));

const WORDMARK = "Nari";

/**
 * Starts once the "Nari" typewriter (4 letters, 0.08s stagger, 0.22s fade
 * each) has finished, ~0.46s in. A `transition` prop passed alongside
 * `variants` does NOT reliably override the stagger/delay baked into the
 * variant's own "visible" transition for orchestration purposes — measured
 * via computed-opacity sampling that children started ~0.1-0.25s in
 * despite an overriding transition prop requesting 0.5s. Baking the timing
 * directly into a dedicated variant (like this) is what actually works.
 */
const heroGroupStagger: Variants = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.5, staggerChildren: 0.12 },
  },
};

/**
 * Hero section: "Nari" types on letter-by-letter, then headline/subline/CTA
 * fade up in sequence (one orchestrated intro, ~1.3s, runs once), primary
 * CTA into the scanner.
 */
export default function Hero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <GradientRibbon />

      <motion.div
        className={s.wrap}
        initial="hidden"
        animate="visible"
        variants={heroGroupStagger}
      >
        <div className={s.copy}>
          <Typewriter text={WORDMARK} className={s.eyebrow} />
          <motion.h1 id="hero-title" className={s.title} variants={fadeUp}>
            Your hair, <span className={s.accent}>finally understood.</span>
          </motion.h1>
          <motion.p className={s.subtitle} variants={fadeUp}>
            A quick diagnostic and custom recommendations built for your strands.
          </motion.p>
          <motion.div className={s.ctas} variants={fadeUp}>
            <Link to="/scan" className={s.primary} onClick={() => track("click_start_scan_from_hero")}>
              Start my scan
            </Link>
          </motion.div>
        </div>

        <motion.div className={s.art} variants={clipReveal}>
          <Suspense fallback={<div className={cubeStyles.canvasWrap} />}>
            <Cube />
          </Suspense>
        </motion.div>
      </motion.div>
    </section>
  );
}
