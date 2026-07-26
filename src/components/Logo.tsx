import s from "./Logo.module.css";

export interface LogoProps {
  className?: string;
  /** Forces a specific color instead of inheriting currentColor from the
   * wrapping element — for dropping the mark over a photo or dark surface
   * (e.g. the Part F cube) where nothing above it defines a usable color. */
  color?: string;
}

/**
 * The "Nari" wordmark, as a component rather than plain text so the "i"
 * can carry a custom curl mark in place of its dot. Built as real "Nar"
 * text plus a hand-built stem + SVG curl for the "i" — not a CSS mask over
 * the font's own dot, which is fragile across browsers/font-rendering
 * engines (a masked dot can reappear or clip oddly depending on how the
 * browser rasterizes the glyph). The stem is a plain div rather than a
 * borrowed glyph (e.g. dotless "ı") so its exact width/height/radius stay
 * fully controllable instead of depending on a specific font's metrics.
 *
 * font-size and color both inherit from whatever wraps this (currentColor
 * / em units throughout) so the same mark drops into the nav, footer, and
 * mobile sheet at their own sizes without a resize prop.
 */
export function Logo({ className, color }: LogoProps) {
  return (
    <span
      className={className ? `${s.logo} ${className}` : s.logo}
      style={color ? { color } : undefined}
      role="text"
      aria-label="Nari"
    >
      <span aria-hidden="true">Nar</span>
      <span className={s.iGroup} aria-hidden="true">
        <span className={s.iStem} />
        <svg className={s.iCurl} viewBox="-3.82 -5.2 9.71 9.92" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 3.86 -4.6 L 4.49 -3.72 L 4.94 -2.77 L 5.21 -1.79 L 5.29 -0.8 L 5.2 0.16 L 4.95 1.06 L 4.54 1.88 L 4.02 2.59 L 3.39 3.18 L 2.68 3.63 L 1.93 3.94 L 1.16 4.1 L 0.39 4.12 L -0.34 4.01 L -1.03 3.78 L -1.64 3.43 L -2.17 2.99 L -2.6 2.48 L -2.92 1.92 L -3.12 1.33 L -3.22 0.72 L -3.2 0.13 L -3.09 -0.44 L -2.87 -0.96 L -2.58 -1.42 L -2.22 -1.8 L -1.81 -2.11 L -1.36 -2.34 L -0.89 -2.47 L -0.42 -2.52 L 0.04 -2.48 L 0.47 -2.37 L 0.86 -2.18 L 1.2 -1.93 L 1.49 -1.64 L 1.71 -1.31 L 1.86 -0.95 L 1.95 -0.58 L 1.96 -0.22 L 1.92 0.13"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}
