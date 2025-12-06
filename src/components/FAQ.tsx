import { useState } from "react";
import s from "@/styles/FAQ.module.css";

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
      "Nari centers kinky, coily, and curly hair—our first audience. We’re expanding to support all curl patterns.",
  },
  {
    id: "products",
    question: "Will I need to buy new products?",
    answer:
      "Not necessarily. Nari can work with your current stash and suggest options across budgets when you’re ready to try something new.",
  },
  {
    id: "medical",
    question: "Does Nari diagnose medical issues?",
    answer:
      "No. Nari focuses on hair care guidance, routines, and styles. For scalp or medical concerns, always consult a licensed professional.",
  },
];

export default function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className={s.section} aria-labelledby="faq-title">
      <div className={s.wrap}>
        <h2 id="faq-title" className={s.heading}>
          Frequently Asked Questions
        </h2>

        <div className={s.list} role="list">
          {ITEMS.map((item) => {
            const isOpen = item.id === openId;
            return (
              <div
                key={item.id}
                className={s.item}
                role="listitem"
              >
                <button
                  type="button"
                  className={s.trigger}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${item.id}`}
                  id={`faq-trigger-${item.id}`}
                  onClick={() => toggle(item.id)}
                >
                  <span className={s.question}>{item.question}</span>
                  <span
                    className={`${s.icon} ${isOpen ? s.iconOpen : ""}`}
                    aria-hidden="true"
                  />
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
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
