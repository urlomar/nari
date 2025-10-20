import s from "@/styles/Testimonials.module.css";

/** Lightweight social proof placeholder (can be swapped for real quotes). */
export default function Testimonials() {
  return (
    <section className={s.section} aria-labelledby="proof-title">
      <div className={s.wrap}>
        <h2 id="proof-title">Loved by early testers</h2>
        <div className={s.row}>
          <blockquote>
            “Finally—recommendations that get my coils, not generic advice.”
            <cite>— Maya, 4C</cite>
          </blockquote>
          <blockquote>
            “Breakage is way down, and wash day is faster.” <cite>— Tasha, 3C</cite>
          </blockquote>
          <blockquote>
            “The routine cards are so clear and doable.” <cite>— Yara, 4A</cite>
          </blockquote>
        </div>
      </div>
    </section>
  );
}
