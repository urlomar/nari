// src/components/Hero.tsx
import s from "../styles/Hero.module.css";
import { track } from "@/lib/analytics";

/**
 * Hero section with value prop and primary CTA.
 * Sticks to the top of the viewport so the rest of the page scrolls over it.
 */
export default function Hero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.gradient} />

      <div className={s.wrap}>
        <div className={s.copy}>
          <h1 id="hero-title" className={s.title}>
            Be the first to experience Nari
          </h1>

          <p className={s.subtitle}>
            Nari learns your texture, porosity, and goals to recommend routines,
            products, and protective styles that actually work—while guarding
            against heat damage and breakage.
          </p>

          <div className={s.ctas}>
            <a
              href="#mailing"
              className={s.secondary}
              onClick={() => track("click_join_list_from_hero")}
            >
              Join the list
            </a>
          </div>
        </div>

        <div className={s.art} aria-hidden="true">
          <div className={s.blob} />
          <div className={s.card}>
            <div className={s.cardHeader}>
              <span className={s.pill}>Today’s Routine</span>
            </div>
            <ul className={s.cardList}>
              <li>Hydrating co-wash</li>
              <li>Leave-in + sealant</li>
              <li>Air-dry with curl clips</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
