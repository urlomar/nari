import { useState } from "react";
import { PhotoCapture } from "../components/PhotoCapture";
import type { PhotoStepConfig } from "../steps";
import s from "../scanner.module.css";

export interface PhotoStepProps {
  config: PhotoStepConfig;
  stepNumber: number;
  totalSteps: number;
  file: File | null;
  previewUrl: string | null;
  compressing: boolean;
  onCapture: (file: File) => void;
  onRetake: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhotoStep({
  config,
  stepNumber,
  totalSteps,
  file,
  previewUrl,
  compressing,
  onCapture,
  onRetake,
  onBack,
  onNext,
}: PhotoStepProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={s.step}>
      <p className={s.progress}>
        {stepNumber}/{totalSteps}
      </p>
      <h2 className={s.heading}>{config.title}</h2>
      <p className={s.body}>{config.instruction}</p>

      {previewUrl ? (
        <div className={s.previewWrap}>
          <img src={previewUrl} alt="" className={s.preview} />
          <button type="button" className={s.textButton} onClick={onRetake}>
            Retake
          </button>
        </div>
      ) : (
        <>
          <div className={s.silhouetteSlot} aria-hidden="true" />
          <PhotoCapture
            onSelect={(selected) => {
              setError(null);
              onCapture(selected);
            }}
            onError={setError}
          />
        </>
      )}

      {compressing && <p className={s.hint}>Optimizing photo…</p>}
      {error && (
        <p role="alert" className={s.error}>
          {error}
        </p>
      )}

      <div className={s.navRow}>
        <button type="button" className={s.textButton} onClick={onBack}>
          Back
        </button>
        <button type="button" className={s.primaryButton} onClick={onNext} disabled={!file || compressing}>
          Continue
        </button>
      </div>
    </div>
  );
}
