import { QUIZ_QUESTIONS } from "./quizQuestions";
import type { QuizAnswerValue, QuizOption } from "./quizTypes";

/**
 * Shared lookup from a quiz question's raw answer value (e.g. "fine_low",
 * "breakage") back to the option Nya wrote for it — used by both
 * ReviewStep.tsx (the read-only answer review screen) and ScanResults.tsx
 * (humanizing scoring.ts's matchReasons) so neither has to re-derive this
 * mapping.
 */
function findOption(questionId: string, value: string): QuizOption | undefined {
  return QUIZ_QUESTIONS.find((q) => q.id === questionId)?.options.find((o) => o.value === value);
}

export function getOptionLabel(questionId: string, value: string): string {
  return findOption(questionId, value)?.label ?? value;
}

/** Label plus its secondary line (sub/desc), if the option has one. */
export function getOptionDisplay(questionId: string, value: string): string {
  const option = findOption(questionId, value);
  if (!option) return value;
  const secondary = option.sub ?? option.desc;
  return secondary ? `${option.label} — ${secondary}` : option.label;
}

/**
 * Formats a stored quiz answer (single string or ordered string[]) for
 * human display. A `ranked`-mode question's array is numbered by position
 * (1., 2., 3. — order is significant, it's the user's declared priority),
 * not just joined — plain `multi` arrays (goals, sensitivities) have no
 * such ordering to show.
 */
export function formatAnswerDisplay(questionId: string, value: QuizAnswerValue): string {
  if (Array.isArray(value)) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId);
    if (question?.selectionMode === "ranked") {
      return value.map((v, index) => `${index + 1}. ${getOptionLabel(questionId, v)}`).join("   ");
    }
    return value.map((v) => getOptionLabel(questionId, v)).join(" · ");
  }
  return getOptionDisplay(questionId, value);
}
