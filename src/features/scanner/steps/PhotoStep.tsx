import { useState } from "react";
import { PhotoCapture } from "../components/PhotoCapture";
import s from "../scanner.module.css";

export interface PhotoStepProps {
  file: File | null;
  previewUrl: string | null;
  compressing: boolean;
  onCapture: (file: File) => void;
  onRetake: () => void;
  onBack: () => void;
  onNext: () => void;
}

export function PhotoStep({ file, previewUrl, compressing, onCapture, onRetake, onBack, onNext }: PhotoStepProps) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div className={s.step}>
      <h2 className={s.heading}>A photo of your hair</h2>
      <p className={s.body}>
        Face the camera and pull your hair back so we can see your natural texture and shape.
      </p>

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
