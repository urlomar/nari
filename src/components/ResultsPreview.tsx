import { motion } from "motion/react";
import s from "@/styles/ResultsPreview.module.css";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";

const SAMPLE_RECOMMENDATIONS = [
  { title: "Hydrating leave-in conditioner", why: "Locks in moisture for high-porosity strands." },
  { title: "Weekly deep conditioning treatment", why: "Restores elasticity between wash days." },
  { title: "Silk or satin pillowcase", why: "Cuts down on friction and frizz overnight." },
];

/** Polished static mock of the real results screen, for the landing page. */
export default function ResultsPreview() {
  return (
    <section className={s.section} aria-labelledby="results-preview-title">
      <motion.div
        className={s.wrap}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerChildren}
      >
        <motion.div className={s.intro} variants={fadeUp}>
          <h2 id="results-preview-title" className={s.heading}>
            See exactly what you&rsquo;ll get
          </h2>
          <p className={s.body}>A clear read on your hair, and a routine you can actually follow.</p>
        </motion.div>

        <motion.div className={s.card} variants={fadeUp} aria-hidden="true">
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
      </motion.div>
    </section>
  );
}
