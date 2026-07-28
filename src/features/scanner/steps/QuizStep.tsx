import type { QuizAnswers, QuizQuestion } from "@/lib/schemas";
import { QUIZ_QUESTION_COUNT } from "../steps";
import { ChipOptions } from "../components/ChipOptions";
import { Interstitial } from "../components/Interstitial";
import s from "../scanner.module.css";

export interface QuizStepProps {
  questions: QuizQuestion[];
  quizIndex: number;
  quizAnswers: QuizAnswers;
  showInterstitial: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onDismissInterstitial: () => void;
  onBack: () => void;
}

export function QuizStep({
  questions,
  quizIndex,
  quizAnswers,
  showInterstitial,
  onAnswer,
  onDismissInterstitial,
  onBack,
}: QuizStepProps) {
  if (showInterstitial) {
    return (
      <div className={s.stepCenter}>
        <Interstitial onDismiss={onDismissInterstitial} />
      </div>
    );
  }

  const question = questions[quizIndex];
  if (!question) {
    // Mock questions are still loading — brief, same shimmer language as
    // the analyzing screen rather than a bare blank frame.
    return (
      <div className={s.stepCenter}>
        <div className={s.shimmer} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className={s.step}>
      <p className={s.progress}>
        Question {quizIndex + 1}/{QUIZ_QUESTION_COUNT}
      </p>
      <h2 className={s.heading}>{question.text}</h2>
      <ChipOptions
        options={question.options}
        selected={quizAnswers[question.id] ?? null}
        onSelect={(value) => onAnswer(question.id, value)}
      />
      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
