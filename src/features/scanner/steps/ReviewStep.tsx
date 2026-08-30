import { QUIZ_QUESTIONS } from "../quiz/quizQuestions";
import { formatAnswerDisplay } from "../quiz/quizLabels";
import type { QuizAnswers } from "../quiz/quizTypes";
import s from "../scanner.module.css";

export interface ReviewStepProps {
  quizAnswers: QuizAnswers;
  onBack: () => void;
  onContinue: () => void;
  onStartOver: () => void;
}

/**
 * Read-only confirmation screen between the last quiz question and results
 * (Final Spike, P2 of 4) — takes visual inspiration from Nya's original
 * "Your Nari profile / Nari's got you, sis. 🌿" done-screen (see the old
 * ProfileStep, now superseded) but with new copy and no photo shown (the
 * photo currently feeds nothing — see PhotoStep.tsx — so surfacing it here
 * would imply it does).
 *
 * Deliberately no inline editing or step-jumping: if something's wrong,
 * the user hits Back, which already preserves every answer. Inline editing
 * across all 9 question types was considered and explicitly deferred — see
 * DECISIONS.md.
 */
export function ReviewStep({ quizAnswers, onBack, onContinue, onStartOver }: ReviewStepProps) {
  const answered = QUIZ_QUESTIONS.filter((q) => quizAnswers[q.id] !== undefined);

  return (
    <div className={s.step}>
      <h2 className={s.heading}>Here&rsquo;s what you told Nari</h2>
      <p className={s.body}>
        Take a look and fix anything that looks incorrect before we build your recommendations.
      </p>

      <ul className={s.summaryList}>
        {answered.map((question) => (
          <li key={question.id} className={s.summaryRow}>
            <p className={s.summaryQuestion}>{question.question}</p>
            <p className={s.summaryAnswer}>{formatAnswerDisplay(question.id, quizAnswers[question.id])}</p>
          </li>
        ))}
      </ul>

      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
        <div className={s.navRowActions}>
          <button type="button" className={s.outlineButton} onClick={onStartOver}>
            Start over
          </button>
          <button type="button" className={s.primaryButton} onClick={onContinue}>
            Build my recommendations
          </button>
        </div>
      </div>
    </div>
  );
}
