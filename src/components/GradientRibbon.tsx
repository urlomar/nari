import { useEffect, useRef } from "react";
import s from "./GradientRibbon.module.css";

type GradientRibbonProps = {
  /**
   * "hero" pins to the viewport (behind the navbar + hero, covered once
   * later opaque sections scroll over it). "accent" is a fainter, smaller
   * version confined to whatever section renders it (e.g. the final CTA).
   */
  variant?: "hero" | "accent";
};

/**
 * Stripe-style layered gradient ribbon: 2-3 overlapping skewed/rotated
 * gradient layers (heavy-blur outer, sharper core), each on its own slow,
 * independent transform loop so it reads as drifting light rather than a
 * looping animation. Transform/opacity only — blur is static per layer.
 *
 * The "hero" variant also carries a mouse-reactive glow (desktop/fine-
 * pointer only — see .mouseGlow's media query, which is the actual gate;
 * the JS listener below is skipped on touch devices too, just to avoid
 * pointless work, not for correctness) that follows the cursor via CSS
 * custom properties rather than re-rendering React on every mousemove.
 */
export function GradientRibbon({ variant = "hero" }: GradientRibbonProps) {
  const isAccent = variant === "accent";
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAccent) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const el = wrapRef.current;
    if (!el) return;

    function onMouseMove(e: MouseEvent) {
      el!.style.setProperty("--mx", `${e.clientX}px`);
      el!.style.setProperty("--my", `${e.clientY}px`);
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [isAccent]);

  return (
    <div
      ref={wrapRef}
      className={`${s.wrap} ${isAccent ? s.accentWrap : s.heroWrap}`}
      aria-hidden="true"
    >
      {!isAccent && <div className={s.mouseGlow} />}
      <div className={`${s.layer} ${s.layerOuter}`} />
      {!isAccent && <div className={`${s.layer} ${s.layerMid}`} />}
      <div className={`${s.layer} ${s.layerCore}`} />
    </div>
  );
}
