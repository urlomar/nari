import { useEffect, useState } from "react";
import { NavLink, Link, Outlet, useLocation } from "react-router-dom";
import s from "../styles/RootLayout.module.css";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { track } from "@/lib/analytics";

const SCROLL_THRESHOLD = 64;

/**
 * RootLayout provides the global shell (header, footer, main content).
 * @remarks Includes a skip-link, accessible navigation, and focus outlines.
 * Header is transparent over the hero and frosts on scroll; mobile gets a
 * full-screen sheet menu instead of the inline link row.
 */
export default function RootLayout() {
  const year = new Date().getFullYear();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > SCROLL_THRESHOLD);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      <a className={s.skip} href="#main">
        Skip to content
      </a>

      <header className={`${s.header} ${scrolled ? s.headerScrolled : ""}`}>
        <nav className={s.nav} aria-label="Primary">
          <NavLink to="/" aria-label="Nari home">
            <Logo className={s.logo} />
          </NavLink>

          <div className={s.navLinks}>
            <NavLink to="/about" className={s.navLink}>
              About
            </NavLink>
            <NavLink to="/#mailing" className={s.navLink}>
              Get updates <span aria-hidden="true">&rarr;</span>
            </NavLink>
            <Link
              to="/scan"
              className={s.navCta}
              onClick={() => track("click_start_scan_from_nav")}
            >
              Scan my hair
            </Link>
          </div>

          <div className={s.navTrailing}>
            <ThemeToggle />

            <button
              type="button"
              className={s.hamburger}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </nav>
      </header>

      {menuOpen && (
        <div
          id="mobile-menu"
          className={s.mobileSheet}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
        >
          <div className={s.mobileSheetTop}>
            <Logo className={s.logo} />
            <div className={s.navTrailing}>
              <ThemeToggle />
              <button
                type="button"
                className={s.mobileClose}
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              >
                &times;
              </button>
            </div>
          </div>

          <nav className={s.mobileLinks} aria-label="Mobile">
            <NavLink to="/about" className={s.mobileLink}>
              About
            </NavLink>
            <NavLink to="/#mailing" className={s.mobileLink}>
              Get updates
            </NavLink>
            <Link
              to="/scan"
              className={s.mobileCta}
              onClick={() => track("click_start_scan_from_nav")}
            >
              Scan my hair
            </Link>
          </nav>
        </div>
      )}

      <main id="main" className={s.main}>
        <ScrollToTop />
        <Outlet />
      </main>

      <footer className={s.footer}>
        <div className={s.footerInner}>
          <div className={s.footerBrand}>
            <Logo className={s.footerLogo} />
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
                  <span className={s.footerLinkText}>Nya Muir on LinkedIn</span>
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
                  <span className={s.footerLinkText}>Omar Dixon, Jr on LinkedIn</span>
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
