import s from "../scanner.module.css";

export interface AnalyzingStepProps {
  error: string | null;
  onRetry: () => void;
}

export function AnalyzingStep({ error, onRetry }: AnalyzingStepProps) {
  if (error) {
    return (
      <div className={s.stepCenter}>
        <p role="alert" className={s.error}>
          {error}
        </p>
        <button type="button" className={s.primaryButton} onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className={s.stepCenter}>
      <div className={s.shimmer} aria-hidden="true" />
      <p className={s.body} aria-live="polite">
        Building your recommendations…
      </p>
      <p className={s.privacyLine}>
        Your answers are used only to build these recommendations — never stored or shared.
      </p>
    </div>
  );
}
