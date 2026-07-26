import { useState } from "react";
import { motion } from "motion/react";
import s from "@/styles/FAQ.module.css";
import { useScrollReveal } from "@/styles/useScrollReveal";

type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

/** FAQ block styled as an accordion with + / × toggle. */
const ITEMS: FaqItem[] = [
  {
    id: "who",
    question: "Who is Nari for?",
    answer:
      "Nari centers curly, coily, and afro textured hair patterns. We aim to expand support across all curl patterns!",
  },
  {
    id: "why",
    question: "Why was Nari created?",
    answer:
      "After transitioning her natural hair for over 2 years, founder of Nari, Nya Muir noticed a need for streamlined experimentation and understanding of natural hair textures. She figured if there was a way to make curly and/or Afro-textured hair care cheaper, faster, and more efficient, then more people would embrace their hair in its most natural state.",
  },
  {
    id: "why-use",
    question: "Why should I use Nari?",
    answer:
      "Feeling comfortable and beautiful in your natural hair shouldn't have so many obstacles. Let Nari help you save money, time, and effort to unlock your most authentic self.",
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const { ref, style } = useScrollReveal<HTMLDivElement>({ distance: 18 });

  return (
    <motion.div ref={ref} style={style} className={s.item} role="listitem">
      <button
        type="button"
        className={s.trigger}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${item.id}`}
        id={`faq-trigger-${item.id}`}
        onClick={onToggle}
      >
        <span className={s.question}>{item.question}</span>
        <span className={`${s.icon} ${isOpen ? s.iconOpen : ""}`} aria-hidden="true" />
      </button>

      <div
        id={`faq-panel-${item.id}`}
        className={`${s.answer} ${isOpen ? s.answerOpen : ""}`}
        role="region"
        aria-labelledby={`faq-trigger-${item.id}`}
      >
        <div className={s.answerInner}>
          <p>{item.answer}</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);
  const heading = useScrollReveal<HTMLHeadingElement>();

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className={s.section} aria-labelledby="faq-title">
      <div className={s.wrap}>
        <motion.h2 id="faq-title" ref={heading.ref} style={heading.style} className={s.heading}>
          Frequently Asked Questions
        </motion.h2>

        <div className={s.list} role="list">
          {ITEMS.map((item) => (
            <FaqAccordionItem
              key={item.id}
              item={item}
              isOpen={item.id === openId}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
