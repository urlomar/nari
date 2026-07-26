import type { Variants } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Reveal an element by fading and sliding up slightly. Transform/opacity only. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASE_OUT }, // matches --duration-base
  },
};

/** Applied to a parent so its children (using fadeUp) reveal in sequence. */
export const staggerChildren: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Single letter for a typewriter-style reveal: soft fade, no cursor. */
export const letterFade: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: EASE_OUT },
  },
};

/** Applied to a parent so its letter children (using letterFade) type on. */
export const staggerLetters: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

/**
 * Reveal via a clip-path wipe (top-down) instead of a plain opacity fade —
 * used for hero media and results cards specifically, where a "physical"
 * reveal reads better than content just fading in. clip-path is
 * hardware-accelerated the same way transform/opacity are, so this is
 * still cheap.
 */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(100% 0% 0% 0%)", opacity: 0 },
  visible: {
    clipPath: "inset(0% 0% 0% 0%)",
    opacity: 1,
    transition: { duration: 0.5, ease: EASE_OUT },
  },
};
