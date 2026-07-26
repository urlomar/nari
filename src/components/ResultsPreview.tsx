import { motion } from "motion/react";
import s from "@/styles/ResultsPreview.module.css";
import { useScrollReveal } from "@/styles/useScrollReveal";

const SAMPLE_RECOMMENDATIONS = [
  { title: "Hydrating leave-in conditioner", why: "Locks in moisture for high-porosity strands." },
  { title: "Weekly deep conditioning treatment", why: "Restores elasticity between wash days." },
  { title: "Silk or satin pillowcase", why: "Cuts down on friction and frizz overnight." },
];

/** Polished static mock of the real results screen, for the landing page. */
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

        <motion.div ref={card.ref} style={card.style} className={s.card} aria-hidden="true">
          <span className={s.previewTag}>Sample result</span>
          <p className={s.eyebrow}>Your hair type</p>
          <p className={s.curlPattern}>3C</p>
          <p className={s.notes}>Well-defined curl clumping with some dryness at the ends.</p>
          <ul className={s.recList}>
            {SAMPLE_RECOMMENDATIONS.map((rec) => (
              <li key={rec.title} className={s.recCard}>
                <h3 className={s.recTitle}>{rec.title}</h3>
                <p className={s.recWhy}>{rec.why}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
