import s from "./GrainOverlay.module.css";

/**
 * Fixed, site-wide subtle noise texture (~3.5% opacity) so gradients read
 * as physical/printed rather than flat digital. Mounted once at the app
 * root (main.tsx) rather than per-layout, since the scanner routes render
 * outside RootLayout and should still get it.
 */
export function GrainOverlay() {
  return <div className={s.grain} aria-hidden="true" />;
}
