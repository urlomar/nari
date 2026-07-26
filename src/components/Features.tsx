import { motion } from "motion/react";
import s from "@/styles/Features.module.css";
import { useScrollReveal } from "@/styles/useScrollReveal";

const STEPS = [
  {
    title: "Scan",
    body: "Snap three quick photos — front, back, and a close-up of your strands.",
  },
  {
    title: "Analyze",
    body: "We analyze your hair texture, porosity, and condition. No guesswork.",
  },
  {
    title: "Your routine",
    body: "Get personalized product recommendations and routine suggestions.",
  },
];

function FeatureCard({ step, index }: { step: (typeof STEPS)[number]; index: number }) {
  const { ref, style } = useScrollReveal<HTMLLIElement>();
  return (
    <motion.li ref={ref} style={style} className={s.card}>
      <span className={s.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
      <h3 className={s.cardTitle}>{step.title}</h3>
      <p className={s.cardBody}>{step.body}</p>
    </motion.li>
  );
}

/** How it works: Scan -> Analyze -> Your routine, as a simple bento grid. */
export default function Features() {
  const heading = useScrollReveal<HTMLHeadingElement>();

  return (
    <section className={s.section} aria-labelledby="how-it-works-title">
      <div className={s.wrap}>
        <motion.h2
          id="how-it-works-title"
          ref={heading.ref}
          style={heading.style}
          className={s.heading}
        >
          How it works
        </motion.h2>
        <ul className={s.grid}>
          {STEPS.map((step, index) => (
            <FeatureCard key={step.title} step={step} index={index} />
          ))}
        </ul>
      </div>
    </section>
  );
}
