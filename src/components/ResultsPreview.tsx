import { motion } from "motion/react";
import s from "@/styles/ResultsPreview.module.css";
import { useScrollReveal } from "@/styles/useScrollReveal";
import SampleResultCard, { PATTERN_LEAVE_IN, OUIDAD_CREAM } from "@/components/SampleResultCard";

/**
 * Polished static mock of two real recommendation cards, for the landing
 * page (Final Spike, P4 of 4, Part E — replaces the old invented-copy
 * mock; widened to two cards in P5, Part A, so the section fills its
 * visual footprint at native card sizing instead of one stretched card —
 * see DECISIONS.md's "Sample result sizing" section). "Spotlight frame"
 * treatment picked by the CEO in P4; "two cards side by side" picked from
 * 3 generated sizing options in P5. SampleResultCard carries real catalog
 * data and ProductCard's exact visual conventions; this component only
 * supplies the gradient-tinted frame and ribbon badge around it.
 */
export default function ResultsPreview() {
  const intro = useScrollReveal<HTMLDivElement>();
  const card = useScrollReveal<HTMLDivElement>({ distance: 36 });

  return (
    <section className={s.section} aria-labelledby="results-preview-title">
      <div className={s.wrap}>
        <motion.div ref={intro.ref} style={intro.style} className={s.intro}>
          <h2 id="results-preview-title" className={s.heading}>
            Nari is ready, are you?
          </h2>
          <p className={s.body}>Real results, recommendations, and a routine you can try tomorrow.</p>
        </motion.div>

        <motion.div ref={card.ref} style={card.style} className={s.spotlightFrame} aria-hidden="true">
          <span className={s.ribbonBadge}>Sample result</span>
          <div className={s.twoCol}>
            <SampleResultCard product={PATTERN_LEAVE_IN} />
            <SampleResultCard product={OUIDAD_CREAM} />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
