import s from "@/styles/Page.module.css";

/** About page with mission and inclusion statement. */
export default function About() {
  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <h1>About Nari</h1>
        <p>
          Nari is a personalized hair care app for people with kinky and curly hair.
          We recommend products, help you understand your hair type, suggest protective styles,
          and support recovery from heat and breakage.
        </p>
        <p>We’re starting with a focus on Black women and expanding for all curl patterns.</p>
      </div>
    </section>
  );
}
