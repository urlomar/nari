import { GradientRibbon } from "@/components/GradientRibbon";

/**
 * Rendered once by ScannerRoute, as a sibling of the step-switching content
 * — never inside a step — so it stays mounted and breathing across every
 * transition instead of resetting like a page reload. GradientRibbon's
 * "hero" variant is already `position: fixed` with `z-index: -1` (see its
 * own file), so simply keeping this component mounted is enough; nothing
 * extra is needed here to pin it in place.
 */
export function ScanBackground() {
  return <GradientRibbon />;
}
