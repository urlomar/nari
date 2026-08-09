import type { ReactNode } from "react";
import type { CurlIconType } from "./quizTypes";

export interface CurlIconProps {
  type: CurlIconType;
  size?: number;
}

/**
 * Ported as-is from nya-quiz-reference.jsx (shape/path data unchanged) —
 * only the color changed, from a hardcoded hex to `currentColor`, so it
 * inherits whatever the option button sets for text color and repaints
 * correctly for both the selected/unselected state and both themes with
 * zero theme-aware logic of its own.
 */
export function CurlIcon({ type, size = 44 }: CurlIconProps) {
  const paths: Record<CurlIconType, ReactNode> = {
    wave: (
      <path
        d="M4 22 Q12 10 20 22 Q28 34 36 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    ),
    s_wave: (
      <path
        d="M6 14 Q14 6 22 14 Q30 22 38 14 M6 28 Q14 20 22 28 Q30 36 38 28"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    ),
    corkscrew: (
      <path
        d="M20 4 C30 4 34 12 28 18 C22 24 14 24 14 32 C14 38 22 42 28 38"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    ),
    coil: (
      <>
        <ellipse cx="22" cy="16" rx="10" ry="7" fill="none" stroke="currentColor" strokeWidth="3" />
        <ellipse cx="22" cy="30" rx="8" ry="6" fill="none" stroke="currentColor" strokeWidth="3" />
      </>
    ),
    z_coil: (
      <path
        d="M10 10 L20 10 L12 22 L22 22 L14 34 L24 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    tight_coil: (
      <>
        <circle cx="16" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="28" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="22" cy="26" r="6" fill="none" stroke="currentColor" strokeWidth="3" />
        <circle cx="22" cy="38" r="5" fill="none" stroke="currentColor" strokeWidth="3" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-hidden="true">
      {paths[type] ?? paths.wave}
    </svg>
  );
}
