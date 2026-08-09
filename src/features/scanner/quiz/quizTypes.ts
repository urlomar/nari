/**
 * Config shape for the single, config-driven question renderer
 * (QuestionRenderer.tsx). Nya's original file had five separate layout
 * components (IconGrid, CurlGrid, VisualSingle, ChipMulti, RankCards) that
 * were structurally identical — "pick one or more from a list" — and only
 * differed in selection behavior and how each option's content was laid
 * out. Those two axes are what this type splits apart: `selectionMode`
 * (interaction) and `layout` (visual arrangement). See DECISIONS.md for
 * the full tradeoff writeup on why one renderer replaces five components.
 */

export type SelectionMode = "single" | "multi" | "ranked";
export type QuestionLayout = "grid" | "list" | "chips";

/** A curl illustration, rendered via CurlIcon.tsx — see its file for the path data. */
export type CurlIconType = "wave" | "s_wave" | "corkscrew" | "coil" | "z_coil" | "tight_coil";

export interface QuizOption {
  value: string;
  label: string;
  /** Rendered with aria-hidden="true" — the label carries the accessible name. Preserve skin-tone modifiers as written. */
  emoji?: string;
  /** curl_type's illustrated options use this instead of emoji. */
  curl?: CurlIconType;
  /** icon_grid-style secondary line (journey, density, budget). */
  sub?: string;
  /** curl_grid's descriptive line under the label. */
  desc?: string;
  /** visual_single's trailing pill (porosity). */
  tag?: string;
}

export interface QuizQuestionConfig {
  id: string;
  /** One of Nya's three phase names — feeds the shared ScanProgress bar's section labels, not a second progress indicator. */
  phase: string;
  question: string;
  subtitle?: string;
  selectionMode: SelectionMode;
  layout: QuestionLayout;
  /** Column count for layout: "grid" only. */
  columns?: number;
  /** Cap for multi/ranked selection modes. */
  max?: number;
  /** A value that, when selected, clears every other selection (multi/ranked only) — e.g. sensitivities' "none", frustrations' "nothing". */
  exclusiveValue?: string;
  options: QuizOption[];
  /** Nari's Take — collapsible note, only present on journey/porosity/frustrations. */
  nariNote?: string;
}

/**
 * The shape actually held in scanner state: single-select answers are a
 * plain string, multi/ranked answers are a string array (order is
 * significant for ranked — index 0 is the user's #1 priority).
 */
export type QuizAnswerValue = string | string[];
export type QuizAnswers = Record<string, QuizAnswerValue>;
