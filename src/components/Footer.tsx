import s from "@/styles/Footer.module.css";

/** Site-wide footer; minimal content because RootLayout handles copy. */
export default function Footer() {
  return <div className={s.pad} aria-hidden="true" />;
}
