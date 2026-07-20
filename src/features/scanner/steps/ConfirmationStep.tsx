import type { ScanAnswers, ScanPhotos } from "@/lib/schemas";
import { PHOTO_STEPS, QUESTION_STEPS, type PhotoStepId, type QuestionStepId } from "../steps";
import s from "../scanner.module.css";

export interface ConfirmationStepProps {
  previews: Record<keyof ScanPhotos, string | null>;
  answers: ScanAnswers;
  onEditPhoto: (stepId: PhotoStepId) => void;
  onEditAnswer: (stepId: QuestionStepId) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function ConfirmationStep({
  previews,
  answers,
  onEditPhoto,
  onEditAnswer,
  onBack,
  onConfirm,
}: ConfirmationStepProps) {
  const allAnswered = QUESTION_STEPS.every((question) => Boolean(answers[question.key]));

  return (
    <div className={s.step}>
      <h2 className={s.heading}>Everything look right?</h2>

      <div className={s.thumbGrid}>
        {PHOTO_STEPS.map((photo) => (
          <button
            key={photo.id}
            type="button"
            className={s.thumbButton}
            onClick={() => onEditPhoto(photo.id)}
          >
            {previews[photo.key] && <img src={previews[photo.key]!} alt={photo.title} className={s.thumb} />}
            <span className={s.thumbLabel}>{photo.title}</span>
          </button>
        ))}
      </div>

      <ul className={s.answerList}>
        {QUESTION_STEPS.map((question) => {
          const option = question.options.find((o) => o.value === answers[question.key]);
          return (
            <li key={question.id}>
              <button type="button" className={s.answerRow} onClick={() => onEditAnswer(question.id)}>
                <span>{question.question}</span>
                <span className={s.answerValue}>{option?.label ?? "—"}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
        <button type="button" className={s.primaryButton} onClick={onConfirm} disabled={!allAnswered}>
          Analyze my hair
        </button>
      </div>
    </div>
  );
}
