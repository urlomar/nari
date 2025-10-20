import s from "../styles/Page.module.css";

/** 404 fallback route. */
export default function NotFound() {
  return (
    <section className={s.section}>
      <div className={s.wrap}>
        <h1>Page not found</h1>
        <p>Try the navigation above, or head back to the home page.</p>
      </div>
    </section>
  );
}
