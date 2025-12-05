import { NavLink, Outlet } from "react-router-dom";
import s from "../styles/RootLayout.module.css";
import { ScrollToTop } from "@/components/ScrollToTop";

/**
 * RootLayout provides the global shell (header, footer, main content).
 * @remarks Includes a skip-link, accessible navigation, and focus outlines.
 */
export default function RootLayout() {
  return (
    <>
      <a className={s.skip} href="#main">Skip to content</a>
      <header className={s.header}>
        <nav className={s.nav} aria-label="Primary">
          <NavLink to="/" className={s.logo} aria-label="Nari home">
            Nari
          </NavLink>
          <ul className={s.menu}>
            <li><NavLink to="/about">About</NavLink></li>
            <li><NavLink to="/contact" className={s.cta}>Get Updates</NavLink></li>
          </ul>
        </nav>
      </header>
      <main id="main" className={s.main}>
        <ScrollToTop />
        <Outlet />
      </main>
      <footer className={s.footer}>
        <p>© {new Date().getFullYear()} Nari · Lovingly built for curls, coils, and kinks</p>
      </footer>
    </>
  );
}
