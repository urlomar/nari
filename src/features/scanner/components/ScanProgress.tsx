import { QUIZ_PHASES, QUIZ_QUESTIONS } from "../quiz/quizQuestions";
import { QUIZ_QUESTION_COUNT, TOTAL_PROGRESS_UNITS, type StepId } from "../steps";
import s from "./ScanProgress.module.css";

export interface ScanProgressProps {
  step: StepId;
  quizIndex: number;
}

const PHOTO_LABEL = "Your photo";
const REVIEW_LABEL = "Review your answers";

// Section order for progress purposes, now that the photo comes first
// (Final Spike, P2 of 4): "Your photo" -> Nya's three quiz phases -> the
// review screen. QUIZ_PHASES itself is unchanged (still just the 3 quiz
// phase names, in quiz order) — the photo/review labels are handled here,
// outside that list.
function activeSection(step: StepId, quizIndex: number): string | null {
  if (step === "photo") return PHOTO_LABEL;
  if (step === "quiz") return QUIZ_QUESTIONS[quizIndex]?.phase ?? QUIZ_PHASES[0];
  if (step === "review" || step === "analyzing") return REVIEW_LABEL;
  return null;
}

function currentUnit(step: StepId, quizIndex: number): number {
  // Photo is unit 1 of TOTAL_PROGRESS_UNITS now that it's first.
  if (step === "photo") return 1;
  // Quiz units are offset by 1 to account for photo already being done.
  if (step === "quiz") return Math.min(quizIndex + 1, QUIZ_QUESTION_COUNT) + 1;
  // Review/analyzing sit after all 9 quiz questions + the photo — full bar.
  if (step === "review" || step === "analyzing") return TOTAL_PROGRESS_UNITS;
  return 0;
}

/**
 * Single progress bar spanning the whole flow (photo + 9-question quiz) —
 * no per-section resets, per the "one continuous journey" brief. Hidden
 * during the intro, which isn't a step for progress purposes.
 *
 * Shows only the CURRENT section's label — "Your photo", one of Nya's
 * three phase names, or "Review your answers" — not all of them at once:
 * her phase names are full sentences ("What are we building toward?"), and
 * this bar lives in a 480px-max-width wrap, so cramming several in side by
 * side would overflow badly. A single active caption + a "current unit /
 * total" counter fits that width and still surfaces the phase name Part D
 * asked for.
 */
export function ScanProgress({ step, quizIndex }: ScanProgressProps) {
  const section = activeSection(step, quizIndex);
  if (!section) return null;

  const unit = currentUnit(step, quizIndex);
  const percent = Math.round((unit / TOTAL_PROGRESS_UNITS) * 100);

  return (
    <div className={s.wrap}>
      <div className={s.track}>
        <div className={s.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={s.labels}>
        <span className={s.label} data-active>
          {section}
        </span>
        <span className={s.counter}>
          {unit} / {TOTAL_PROGRESS_UNITS}
        </span>
      </div>
    </div>
  );
}
