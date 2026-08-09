import { QUIZ_PHASES, QUIZ_QUESTIONS } from "../quiz/quizQuestions";
import { QUIZ_QUESTION_COUNT, TOTAL_PROGRESS_UNITS, type StepId } from "../steps";
import s from "./ScanProgress.module.css";

export interface ScanProgressProps {
  step: StepId;
  quizIndex: number;
}

const PHOTO_LABEL = "Your photo";

function activeSection(step: StepId, quizIndex: number): string | null {
  if (step === "quiz") return QUIZ_QUESTIONS[quizIndex]?.phase ?? QUIZ_PHASES[0];
  if (step === "photo" || step === "analyzing") return PHOTO_LABEL;
  return null;
}

function currentUnit(step: StepId, quizIndex: number): number {
  if (step === "quiz") return Math.min(quizIndex + 1, QUIZ_QUESTION_COUNT);
  if (step === "photo") return QUIZ_QUESTION_COUNT + 1;
  if (step === "analyzing") return TOTAL_PROGRESS_UNITS;
  return 0;
}

/**
 * Single progress bar spanning the whole flow (9-question quiz + photo) —
 * no per-section resets, per the "one continuous journey" brief. Hidden
 * during the intro, which isn't a step for progress purposes.
 *
 * Shows only the CURRENT section's label (one of Nya's three phase names,
 * or "Your photo"), not all four at once — her phase names are full
 * sentences ("What are we building toward?"), and this bar lives in a
 * 480px-max-width wrap, so four of them side by side would overflow badly.
 * A single active caption + a "current unit / total" counter fits that
 * width and still surfaces the phase name Part D asked for.
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
