import { NavLink, Outlet } from "react-router-dom";
import s from "../styles/RootLayout.module.css";
import { ScrollToTop } from "@/components/ScrollToTop";

/**
 * RootLayout provides the global shell (header, footer, main content).
 * @remarks Includes a skip-link, accessible navigation, and focus outlines.
 */
export default function RootLayout() {
  const year = new Date().getFullYear();

  return (
    <>
      <a className={s.skip} href="#main">
        Skip to content
      </a>

      <header className={s.header}>
        <nav className={s.nav} aria-label="Primary">
          <NavLink to="/" className={s.logo} aria-label="Nari home">
            Nari
          </NavLink>
          <ul className={s.menu}>
            <li>
              <NavLink to="/about">About</NavLink>
            </li>
            <li>
              <NavLink to="/contact" className={s.cta}>
                Get Updates
              </NavLink>
            </li>
          </ul>
        </nav>
      </header>

      <main id="main" className={s.main}>
        <ScrollToTop />
        <Outlet />
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <span className={s.footerLogo}>Nari</span>
            <p className={s.footerTagline}>
              Personalized hair care for curls, coils, and fros.
            </p>
          </div>

          <div className={s.footerContact}>
            <h3 className={s.footerHeading}>Contact</h3>
            <a
              href="mailto:nari.curls@gmail.com"
              className={s.footerLink}
            >
              <span className={s.iconEmail} aria-hidden="true">
                ✉
              </span>
              <span className={s.footerLinkText}>
                nari.curls@gmail.com
              </span>
            </a>
          </div>

          <div className={s.footerSocial}>
            <h3 className={s.footerHeading}>Connect</h3>
            <ul className={s.socialList}>
              <li className={s.socialItem}>
                <a
                  href="https://www.linkedin.com/in/nya-muir-ab0649292/"
                  target="_blank"
                  rel="noreferrer"
                  className={s.footerLink}
                >
                  <span className={s.iconLinkedIn} aria-hidden="true">
                    in
                  </span>
                  <span className={s.footerLinkText}>Nya on LinkedIn</span>
                </a>
              </li>
              <li className={s.socialItem}>
                <a
                  href="https://www.linkedin.com/in/omardixonjr/"
                  target="_blank"
                  rel="noreferrer"
                  className={s.footerLink}
                >
                  <span className={s.iconLinkedIn} aria-hidden="true">
                    in
                  </span>
                  <span className={s.footerLinkText}>Omar on LinkedIn</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={s.footerBottom}>
          <p>© {year} Nari · Lovingly built for curls, coils, and fros</p>
        </div>
      </footer>
    </>
  );
}
