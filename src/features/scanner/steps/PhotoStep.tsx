import { PhotoCapture } from "../components/PhotoCapture";
import s from "../scanner.module.css";

export interface PhotoStepProps {
  file: File | null;
  previewUrl: string | null;
  compressing: boolean;
  /** Lifted to ScannerRoute — compressImage() failures (e.g. an undecodable HEIC) surface here too, not just PhotoCapture's own validation. */
  error: string | null;
  onErrorChange: (message: string | null) => void;
  onCapture: (file: File) => void;
  onRetake: () => void;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function PhotoStep({
  file,
  previewUrl,
  compressing,
  error,
  onErrorChange,
  onCapture,
  onRetake,
  onBack,
  onNext,
  onSkip,
}: PhotoStepProps) {
  function handleSelect(selected: File) {
    onErrorChange(null);
    onCapture(selected);
  }

  return (
    <div className={s.step}>
      <h2 className={s.heading}>A photo of your hair (optional)</h2>
      <p className={s.body}>
        Face the camera and pull your hair back so we can see your natural texture and shape.
      </p>
      <p className={s.hint}>
        Photo analysis is coming soon — add a photo to try the flow, or skip straight to your results. Your photo
        isn&rsquo;t stored or shared.
      </p>

      {previewUrl ? (
        <div className={s.previewWrap}>
          <img src={previewUrl} alt="" className={s.preview} />
          <button type="button" className={s.textButton} onClick={onRetake}>
            Retake
          </button>
        </div>
      ) : (
        <div className={s.captureButtons}>
          <PhotoCapture capture="environment" label="Take a photo" onSelect={handleSelect} onError={onErrorChange} />
          <PhotoCapture label="Choose a photo" onSelect={handleSelect} onError={onErrorChange} />
        </div>
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
        <div className={s.navRowActions}>
          <button type="button" className={s.textButton} onClick={onSkip}>
            Skip for now
          </button>
          <button type="button" className={s.primaryButton} onClick={onNext} disabled={!file || compressing}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
