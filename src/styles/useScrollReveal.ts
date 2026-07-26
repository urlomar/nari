import { useRef } from "react";
import { useScroll, useTransform, useReducedMotion, type MotionValue } from "motion/react";

export interface ScrollRevealOptions {
  /** How far (px) the element travels while revealing. Default 28. */
  distance?: number;
}

export interface ScrollRevealResult<T extends HTMLElement> {
  ref: React.RefObject<T>;
  /** Spread onto a motion.* element's style prop. */
  style: { opacity: MotionValue<number>; y: MotionValue<number> } | undefined;
}

/**
 * Scroll-linked reveal: opacity/y are continuously derived from the
 * target's own scroll position (useScroll + useTransform), not a one-shot
 * hidden/visible trigger. Replaces the old whileInView+variants pattern —
 * that approach also had a real bug for content already in the viewport
 * at mount (no enter transition ever fires, see About.tsx's history), which
 * a continuous scroll-position mapping can't have: at a given scrollY the
 * output is always the same deterministic value, mount timing included.
 *
 * Scrolling back up automatically reverses the reveal (scrollYProgress
 * just decreases again) rather than needing separate enter/exit handling.
 * Falls back to a static, fully-visible (no style override at all) render
 * under prefers-reduced-motion.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  distance = 28,
}: ScrollRevealOptions = {}): ScrollRevealResult<T> {
  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  // progress 0 when the target's top hits the viewport's bottom edge
  // (about to enter), 1 once it's reached 65% down the viewport (settled
  // into a comfortable reading position).
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.65"] });
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [distance, 0]);

  return {
    ref,
    style: prefersReducedMotion ? undefined : { opacity, y },
  };
}

/**
 * Subtle continuous parallax for section imagery (Hero media, About's
 * photo, the Part F cube) — drifts a fraction of the scroll distance in
 * the opposite direction, for a sense of depth. `strength` is the total
 * px of travel across the element's full pass through the viewport; kept
 * small by default so it reads as gentle, not a distracting drift.
 */
export function useScrollParallax<T extends HTMLElement = HTMLDivElement>(strength = 40) {
  const ref = useRef<T>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [strength, -strength]);

  return { ref, style: prefersReducedMotion ? undefined : { y } };
}

/**
 * Raw 0->1 scroll progress for a target's full pass through the viewport,
 * with no opacity/y derived from it — for callers that need to drive
 * something other than CSS (e.g. the Part F cube's rotation in a
 * useFrame loop). Same underlying useScroll primitive as the two hooks
 * above, so scroll-linked motion stays one shared pattern sitewide rather
 * than a separate bespoke system for the 3D scene.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  return { ref, scrollYProgress };
}
