// src/components/Hero.tsx
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import s from "../styles/Hero.module.css";
import { HeroMedia } from "./HeroMedia";
import { LightStreaks } from "./LightStreaks";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";
import { track } from "@/lib/analytics";

/** Hero section: staggered fade-up reveal, primary CTA into the scanner. */
export default function Hero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <LightStreaks />

      <motion.div className={s.wrap} initial="hidden" animate="visible" variants={staggerChildren}>
        <div className={s.copy}>
          <motion.p className={s.eyebrow} variants={fadeUp}>
            Nari
          </motion.p>
          <motion.h1 id="hero-title" className={s.title} variants={fadeUp}>
            Your hair, finally understood.
          </motion.h1>
          <motion.p className={s.subtitle} variants={fadeUp}>
            Three photos. A curl pattern, porosity read, and a routine built for your hair — not
            someone else&rsquo;s.
          </motion.p>
          <motion.div className={s.ctas} variants={fadeUp}>
            <Link to="/scan" className={s.primary} onClick={() => track("click_start_scan_from_hero")}>
              Start my scan
            </Link>
          </motion.div>
        </div>

        <motion.div className={s.art} variants={fadeUp}>
          <HeroMedia />
        </motion.div>
      </motion.div>
    </section>
  );
}
