import { motion } from "motion/react";
import s from "@/styles/ResultsPreview.module.css";
import { useScrollReveal } from "@/styles/useScrollReveal";
import SampleResultCard from "@/components/SampleResultCard";

/**
 * Polished static mock of a real recommendation card, for the landing page
 * (Final Spike, P4 of 4, Part E — replaces the old invented-copy mock).
 * "Spotlight frame" option, picked by the CEO from 3 generated variants —
 * see DECISIONS.md. SampleResultCard carries real catalog data and
 * ProductCard's exact visual conventions; this component only supplies the
 * gradient-tinted frame and ribbon badge around it.
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
          <SampleResultCard />
        </motion.div>
      </div>
    </section>
  );
}
