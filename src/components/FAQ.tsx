import s from "@/styles/FAQ.module.css";

/** Simple FAQ block; expand with details later. */
export default function FAQ() {
  return (
    <section className={s.section} aria-labelledby="faq-title">
      <div className={s.wrap}>
        <h2 id="faq-title">FAQ</h2>
        <details>
          <summary>Is Nari only for Black women?</summary>
          <p>Nari centers kinky, coily, and curly hair—our first audience. We’re expanding to support all curl patterns.</p>
        </details>
        <details>
          <summary>Will I need to buy new products?</summary>
          <p>Not necessarily. We suggest options across budgets and can adapt to what you already own.</p>
        </details>
        <details>
          <summary>Does it diagnose medical issues?</summary>
          <p>No. We focus on hair care guidance and styles. For medical concerns, consult a professional.</p>
        </details>
      </div>
    </section>
  );
}
