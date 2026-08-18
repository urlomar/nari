import { QUIZ_QUESTIONS } from "../quiz/quizQuestions";
import { formatAnswerDisplay } from "../quiz/quizLabels";
import type { QuizAnswers } from "../quiz/quizTypes";
import s from "../scanner.module.css";

export interface ProfileStepProps {
  quizAnswers: QuizAnswers;
  onBack: () => void;
  onContinue: () => void;
  onStartOver: () => void;
}

/**
 * Ports the spirit of Nya's "done" screen (nya-quiz-reference.jsx) — "Your
 * Nari profile / Nari's got you, sis. 🌿" — as a step between the quiz and
 * the photo, restyled in Nari's light-theme tokens. Unlike her reference,
 * the subtext doesn't promise photo analysis (see CLAUDE.md's Part C
 * honesty fix) and the photo step it leads into is explicitly optional.
 */
export function ProfileStep({ quizAnswers, onBack, onContinue, onStartOver }: ProfileStepProps) {
  const answered = QUIZ_QUESTIONS.filter((q) => quizAnswers[q.id] !== undefined);

  return (
    <div className={s.step}>
      <p className={s.eyebrow}>Your Nari profile</p>
      <h2 className={s.heading}>Nari&rsquo;s got you, sis. 🌿</h2>
      <p className={s.body}>
        Here&rsquo;s what you told us. Next, add a photo to try the flow — or skip straight to your results.
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
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
