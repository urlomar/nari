import s from "@/styles/Page.module.css";

/** Simple teaser pricing; refine later. */
export default function Pricing() {
  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <h1>Pricing</h1>
        <ul className={s.pricing}>
          <li>
            <h3>Free</h3>
            <p>Hair type quiz, sample routines</p>
            <strong>$0</strong>
          </li>
          <li>
            <h3>Pro</h3>
            <p>Personalized routines + product picks</p>
            <strong>$6/mo</strong>
          </li>
          <li>
            <h3>Studio</h3>
            <p>Advanced tracking & stylist tips</p>
            <strong>$12/mo</strong>
          </li>
        </ul>
      </div>
    </section>
  );
}
