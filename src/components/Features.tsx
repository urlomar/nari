import s from "@/styles/Features.module.css";

/** Three key benefits with short, specific copy. */
export default function Features() {
  return (
    <section className={s.section} aria-labelledby="benefits-title">
      <div className={s.wrap}>
        <h2 id="benefits-title">Why Nari works</h2>
        <ul className={s.grid}>
          <li>
            <h3>Knows your texture</h3>
            <p>Quick quiz infers type/porosity/density to tailor routines.</p>
          </li>
          <li>
            <h3>Product picks that fit</h3>
            <p>Curated lists with ingredients that love curls—not fight them.</p>
          </li>
          <li>
            <h3>Damage-aware</h3>
            <p>Heat, breakage, and dryness flags with simple prevention steps.</p>
          </li>
        </ul>
      </div>
    </section>
  );
}
