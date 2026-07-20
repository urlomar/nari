import { motion } from "motion/react";
import s from "@/styles/Features.module.css";
import { fadeUp, staggerChildren } from "@/styles/motionVariants";

const STEPS = [
  {
    title: "Scan",
    body: "Snap three quick photos — front, back, and a close-up of your strands.",
  },
  {
    title: "Analyze",
    body: "We read your curl pattern, porosity, and condition. No guesswork.",
  },
  {
    title: "Your routine",
    body: "Get three tailored recommendations, each with the why behind it.",
  },
];

/** How it works: Scan -> Analyze -> Your routine, as a simple bento grid. */
export default function Features() {
  return (
    <section className={s.section} aria-labelledby="how-it-works-title">
      <motion.div
        className={s.wrap}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerChildren}
      >
        <motion.h2 id="how-it-works-title" className={s.heading} variants={fadeUp}>
          How it works
        </motion.h2>
        <ul className={s.grid}>
          {STEPS.map((step, index) => (
            <motion.li key={step.title} className={s.card} variants={fadeUp}>
              <span className={s.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
              <h3 className={s.cardTitle}>{step.title}</h3>
              <p className={s.cardBody}>{step.body}</p>
            </motion.li>
          ))}
        </ul>
      </motion.div>
    </section>
  );
}
