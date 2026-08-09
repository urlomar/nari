import { QUIZ_QUESTIONS } from "../quiz/quizQuestions";
import type { QuizAnswerValue, QuizAnswers } from "../quiz/quizTypes";
import { QuestionRenderer } from "../quiz/QuestionRenderer";
import { NarisTake } from "../quiz/NarisTake";
import { Interstitial } from "../components/Interstitial";
import s from "../scanner.module.css";

export interface QuizStepProps {
  quizIndex: number;
  quizAnswers: QuizAnswers;
  showInterstitial: boolean;
  onAnswer: (questionId: string, value: QuizAnswerValue) => void;
  onAdvance: () => void;
  onDismissInterstitial: () => void;
  onBack: () => void;
}

const ANSWER_ADVANCE_DELAY_MS = 250;

export function QuizStep({
  quizIndex,
  quizAnswers,
  showInterstitial,
  onAnswer,
  onAdvance,
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

  const question = QUIZ_QUESTIONS[quizIndex];
  if (!question) return null;

  const current = quizAnswers[question.id];
  const isSingle = question.selectionMode === "single";
  const canAdvance = isSingle ? Boolean(current) : Array.isArray(current) && current.length > 0;

  function handleChange(value: QuizAnswerValue) {
    onAnswer(question.id, value);
    // Auto-advance on select for single-choice questions only — multi and
    // ranked questions expect several taps, so they wait for the explicit
    // Continue button instead (see the primaryButton below).
    if (isSingle) {
      window.setTimeout(onAdvance, ANSWER_ADVANCE_DELAY_MS);
    }
  }

  return (
    <div className={s.step}>
      <p className={s.progress}>
        Question {quizIndex + 1}/{QUIZ_QUESTIONS.length}
      </p>
      <p className={s.eyebrow}>{question.phase}</p>
      <h2 className={s.heading}>{question.question}</h2>
      {question.subtitle && <p className={s.body}>{question.subtitle}</p>}

      <QuestionRenderer question={question} value={current} onChange={handleChange} />

      {question.nariNote && <NarisTake note={question.nariNote} />}

      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
        {!isSingle && (
          <button type="button" className={s.primaryButton} onClick={onAdvance} disabled={!canAdvance}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
