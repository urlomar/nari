import type { ChangeEvent } from "react";
import s from "./PhotoCapture.module.css";

export interface PhotoCaptureProps {
  onSelect: (file: File) => void;
  onError: (message: string) => void;
  label?: string;
  disabled?: boolean;
}

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/**
 * Native file input styled as a button. `capture="environment"` opens the
 * device camera on mobile; on desktop it's a plain file picker. A live
 * webcam preview can replace the input internally later without callers
 * changing — the onSelect/onError contract stays the same.
 */
export function PhotoCapture({ onSelect, onError, label = "Take or upload a photo", disabled }: PhotoCaptureProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      onError("That doesn't look like an image. Please choose a photo.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      onError("That photo is larger than 10MB. Please choose a smaller one.");
      return;
    }
    onSelect(file);
  }

  return (
    <label className={s.button} data-disabled={disabled || undefined}>
      <input
        className={s.input}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        disabled={disabled}
      />
      {label}
    </label>
  );
}
