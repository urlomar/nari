import { useEffect } from "react";
import { motion } from "motion/react";
import { Typewriter } from "@/components/Typewriter";
import s from "../scanner.module.css";

export interface InterstitialProps {
  onDismiss: () => void;
}

const INTERSTITIAL_AUTO_DISMISS_MS = 2500;

/**
 * One brief "almost there" beat inserted around question 6-7 of the
 * diagnostic quiz — same visual language as the intro (glow + typewriter),
 * a short encouraging line, auto-advances after a beat or on tap.
 */
export function Interstitial({ onDismiss }: InterstitialProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, INTERSTITIAL_AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);

  return (
    <button
      type="button"
      className={s.interstitialButton}
      onClick={onDismiss}
      aria-label="Continue to the next question"
    >
      <Typewriter text="You're doing great" as="h1" className={s.heading} />
      <motion.p
        className={s.body}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9, duration: 0.25 }}
      >
        Just a few more questions.
      </motion.p>
    </button>
  );
}
