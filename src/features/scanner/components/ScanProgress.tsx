import { QUESTION_STEPS, QUIZ_QUESTION_COUNT, TOTAL_PROGRESS_UNITS, type StepId } from "../steps";
import s from "./ScanProgress.module.css";

export interface ScanProgressProps {
  step: StepId;
  quizIndex: number;
}

type SectionId = "about" | "photo" | "diagnostic";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "about", label: "About you" },
  { id: "photo", label: "Your photo" },
  { id: "diagnostic", label: "Diagnostic" },
];

function activeSection(step: StepId): SectionId | null {
  if (QUESTION_STEPS.some((q) => q.id === step)) return "about";
  if (step === "photo") return "photo";
  if (step === "quiz" || step === "analyzing") return "diagnostic";
  return null;
}

function currentUnit(step: StepId, quizIndex: number): number {
  const questionIndex = QUESTION_STEPS.findIndex((q) => q.id === step);
  if (questionIndex !== -1) return questionIndex + 1;
  if (step === "photo") return QUESTION_STEPS.length + 1;
  if (step === "quiz") {
    return QUESTION_STEPS.length + 1 + Math.min(quizIndex + 1, QUIZ_QUESTION_COUNT);
  }
  if (step === "analyzing") return TOTAL_PROGRESS_UNITS;
  return 0;
}

/**
 * Single progress bar spanning the whole flow (hair questions + photo +
 * quiz) — no per-section resets, per the "one continuous journey" brief.
 * Hidden during the intro, which isn't a step for progress purposes.
 */
export function ScanProgress({ step, quizIndex }: ScanProgressProps) {
  const section = activeSection(step);
  if (!section) return null;

  const unit = currentUnit(step, quizIndex);
  const percent = Math.round((unit / TOTAL_PROGRESS_UNITS) * 100);

  return (
    <div className={s.wrap}>
      <div className={s.track}>
        <div className={s.fill} style={{ width: `${percent}%` }} />
      </div>
      <div className={s.labels}>
        {SECTIONS.map((item) => (
          <span key={item.id} className={s.label} data-active={item.id === section || undefined}>
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}
