import type { ScanAnswers, ScanPhotos } from "@/lib/schemas";
import { STEP_ORDER, type StepId } from "./steps";

export interface ScannerState {
  stepIndex: number;
  photos: ScanPhotos;
  answers: ScanAnswers;
  /** When set (via GOTO from confirmation), NEXT returns here instead of advancing sequentially. */
  returnTo: StepId | null;
  analysisError: string | null;
  analysisAttempt: number;
}

export const initialScannerState: ScannerState = {
  stepIndex: 0,
  photos: { front: null, back: null, strand: null },
  answers: { naturalState: null, product: null, freshness: null },
  returnTo: null,
  analysisError: null,
  analysisAttempt: 0,
};

export type ScannerAction =
  | { type: "SET_PHOTO"; key: keyof ScanPhotos; file: File }
  | { type: "CLEAR_PHOTO"; key: keyof ScanPhotos }
  | { type: "SET_ANSWER"; key: keyof ScanAnswers; value: NonNullable<ScanAnswers[keyof ScanAnswers]> }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "GOTO"; step: StepId; returnTo?: StepId }
  | { type: "ANALYSIS_FAILED"; message: string }
  | { type: "RETRY_ANALYSIS" };

export function scannerReducer(state: ScannerState, action: ScannerAction): ScannerState {
  switch (action.type) {
    case "SET_PHOTO":
      return { ...state, photos: { ...state.photos, [action.key]: action.file } };

    case "CLEAR_PHOTO":
      return { ...state, photos: { ...state.photos, [action.key]: null } };

    case "SET_ANSWER":
      return { ...state, answers: { ...state.answers, [action.key]: action.value } };

    case "NEXT": {
      if (state.returnTo) {
        const index = STEP_ORDER.indexOf(state.returnTo);
        return { ...state, stepIndex: index === -1 ? state.stepIndex : index, returnTo: null };
      }
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, STEP_ORDER.length - 1) };
    }

    case "BACK":
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0), returnTo: null };

    case "GOTO": {
      const index = STEP_ORDER.indexOf(action.step);
      if (index === -1) return state;
      return { ...state, stepIndex: index, returnTo: action.returnTo ?? null };
    }

    case "ANALYSIS_FAILED":
      return { ...state, analysisError: action.message };

    case "RETRY_ANALYSIS":
      return { ...state, analysisError: null, analysisAttempt: state.analysisAttempt + 1 };

    default:
      return state;
  }
}
