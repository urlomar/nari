import { useEffect } from "react";
import { motion, type Variants } from "motion/react";
import { Typewriter } from "@/components/Typewriter";
import { fadeUp } from "@/styles/motionVariants";
import s from "../scanner.module.css";

export interface IntroStepProps {
  onDone: () => void;
}

const INTRO_HOLD_MS = 2200;

// Subline is a separate child, delayed until after the typewriter (16
// letters, default 0.08s stagger + 0.22s fade) has finished revealing —
// same "independent animation, then a delayed group" architecture as
// Hero's eyebrow + heroGroupStagger (see Hero.tsx).
const introGroupStagger: Variants = {
  hidden: {},
  visible: { transition: { delayChildren: 1.0 } },
};

/**
 * First step of /scan. Reuses the homepage hero's typewriter/glow language
 * as a staged transitional beat — anticipation, not a loading screen — then
 * auto-advances into the first question. No spinner, no tap required.
 */
export function IntroStep({ onDone }: IntroStepProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, INTRO_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={s.stepCenter}>
      <Typewriter text="Welcome to Nari" as="h1" className={s.heading} />
      <motion.div initial="hidden" animate="visible" variants={introGroupStagger}>
        <motion.p className={s.body} variants={fadeUp}>
          Let&rsquo;s find out what your hair needs.
        </motion.p>
      </motion.div>
    </div>
  );
}
