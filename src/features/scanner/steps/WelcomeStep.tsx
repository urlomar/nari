import s from "../scanner.module.css";

export interface WelcomeStepProps {
  onStart: () => void;
}

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className={s.stepCenter}>
      <p className={s.eyebrow}>Nari</p>
      <h1 className={s.heading}>Hi, I&rsquo;m Nari — your personal hair analyst.</h1>
      <p className={s.body}>
        Three photos, three quick taps, and I&rsquo;ll tell you exactly what your hair needs.
      </p>
      <button type="button" className={s.primaryButton} onClick={onStart}>
        Start my scan
      </button>
    </div>
  );
}
