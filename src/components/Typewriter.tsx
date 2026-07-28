import { motion, type Variants } from "motion/react";
import { letterFade } from "@/styles/motionVariants";

export interface TypewriterProps {
  text: string;
  as?: "p" | "h1";
  className?: string;
  /** Baked into this instance's own variant — see the note below. */
  delayChildren?: number;
  staggerChildren?: number;
}

/**
 * Letter-by-letter typewriter reveal, extracted from Hero's original inline
 * "Nari" animation so it can be reused for the scan intro. `role="text"` +
 * `aria-label` on the wrapper plus `aria-hidden` letter spans is the
 * accessible pattern for split-into-spans animated text (see CLAUDE.md) —
 * baked in here so every caller gets it for free.
 *
 * delayChildren/staggerChildren are baked directly into a per-instance
 * variant object rather than left to a sibling `transition` prop: a
 * `transition` prop does not reliably override a variant's own baked-in
 * stagger/delay for child orchestration (confirmed via computed-opacity
 * sampling during Hero's original build — see Hero.tsx's git history).
 */
export function Typewriter({ text, as = "p", className, delayChildren = 0, staggerChildren = 0.08 }: TypewriterProps) {
  const container: Variants = {
    hidden: {},
    visible: { transition: { delayChildren, staggerChildren } },
  };

  const MotionTag = as === "h1" ? motion.h1 : motion.p;

  return (
    <MotionTag
      className={className}
      initial="hidden"
      animate="visible"
      variants={container}
      role="text"
      aria-label={text}
    >
      {text.split("").map((letter, i) => (
        <motion.span key={i} variants={letterFade} aria-hidden="true">
          {letter}
        </motion.span>
      ))}
    </MotionTag>
  );
}
