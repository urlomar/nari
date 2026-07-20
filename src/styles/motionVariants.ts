import type { Variants } from "motion/react";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** Reveal an element by fading and sliding up slightly. Transform/opacity only. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT },
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
