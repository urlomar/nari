import s from "@/styles/Hero.module.css";
import { Link } from "react-router-dom";
import { track } from "@/lib/analytics";

/**
 * Hero section with value prop and primary CTA.
 * @param props Optional props for a/b testing future variants.
 */
export default function Hero() {
  return (
    <section className={s.hero} aria-labelledby="hero-title">
      <div className={s.wrap}>
        <h1 id="hero-title">Personalized hair care for curls, coils & kinks.</h1>
        <p className={s.subtitle}>
          Nari learns your texture, porosity, and goals to recommend routines,
          products, and protective styles that actually work—while guarding
          against heat damage and breakage.
        </p>

        <div className={s.ctas}>
          <Link
            to="/app"
            className={s.primary}
            onClick={() => track("click_try_app")}
            aria-label="Try the Nari demo workspace"
          >
            Try the demo
          </Link>
          <a
            href="#mailing"
            className={s.secondary}
            onClick={() => track("click_join_list_from_hero")}
          >
            Join the list
          </a>
        </div>

        <div className={s.art} aria-hidden="true">
          <div className={s.blob}></div>
          <div className={s.card}>
            <strong>Today’s Routine</strong>
            <ul>
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
