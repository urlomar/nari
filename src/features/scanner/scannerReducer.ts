import type { HairContext, NaturalStateAnswer, ProductAnswer, QuizAnswers, QuizQuestion } from "@/lib/schemas";
import { INTERSTITIAL_AFTER_INDEX, QUIZ_QUESTION_COUNT, STEP_ORDER } from "./steps";

export const QUIZ_PROGRESS_STORAGE_KEY = "nari-scan-quiz-progress";

/**
 * Draft version of HairContext — nullable until both pre-quiz questions are
 * answered. Becomes a real HairContext by the time the "quiz" step is
 * reached (QUESTION_STEPS always come before it in STEP_ORDER).
 */
export interface HairContextDraft {
  naturalState: NaturalStateAnswer | null;
  product: ProductAnswer | null;
}

export interface ScannerState {
  stepIndex: number;
  hairContext: HairContextDraft;
  /** Purely in-memory, never persisted — see the sessionStorage note below. */
  photo: File | null;
  quizQuestions: QuizQuestion[];
  quizAnswers: QuizAnswers;
  quizIndex: number;
  showInterstitial: boolean;
  /** Guards against re-triggering the interstitial if the user backs up past it. */
  interstitialShown: boolean;
  analysisError: string | null;
  analysisAttempt: number;
}

interface PersistedQuizProgress {
  hairContext: HairContext;
  quizAnswers: QuizAnswers;
  quizIndex: number;
  interstitialShown: boolean;
}

/**
 * The narrow, deliberate sessionStorage exception (CLAUDE.md): quiz answers,
 * quiz position, and the 2 hair-context answers that feed getRecommendations
 * survive a refresh. The photo never does — it's excluded from this blob and
 * stays purely in React state.
 */
function readPersistedQuizProgress(): PersistedQuizProgress | null {
  try {
    const raw = sessionStorage.getItem(QUIZ_PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as PersistedQuizProgress;
  } catch {
    return null;
  }
}

export function writePersistedQuizProgress(progress: PersistedQuizProgress): void {
  try {
    sessionStorage.setItem(QUIZ_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Private-mode/storage-full: persistence is a nice-to-have, fail silently.
  }
}

export function clearPersistedQuizProgress(): void {
  try {
    sessionStorage.removeItem(QUIZ_PROGRESS_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createInitialScannerState(): ScannerState {
  const base: ScannerState = {
    stepIndex: 0,
    hairContext: { naturalState: null, product: null },
    photo: null,
    quizQuestions: [],
    quizAnswers: {},
    quizIndex: 0,
    showInterstitial: false,
    interstitialShown: false,
    analysisError: null,
    analysisAttempt: 0,
  };

  const restored = readPersistedQuizProgress();
  if (!restored || Object.keys(restored.quizAnswers).length === 0) return base;

  return {
    ...base,
    stepIndex: STEP_ORDER.indexOf("quiz"),
    hairContext: restored.hairContext,
    quizAnswers: restored.quizAnswers,
    quizIndex: restored.quizIndex,
    interstitialShown: restored.interstitialShown,
  };
}

export type ScannerAction =
  | { type: "SET_QUIZ_QUESTIONS"; questions: QuizQuestion[] }
  | { type: "SET_HAIR_ANSWER"; key: keyof HairContextDraft; value: string }
  | { type: "SET_PHOTO"; file: File }
  | { type: "CLEAR_PHOTO" }
  | { type: "SET_QUIZ_ANSWER"; questionId: string; value: string }
  | { type: "DISMISS_INTERSTITIAL" }
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "ANALYSIS_FAILED"; message: string }
  | { type: "RETRY_ANALYSIS" };

export function scannerReducer(state: ScannerState, action: ScannerAction): ScannerState {
  switch (action.type) {
    case "SET_QUIZ_QUESTIONS":
      return { ...state, quizQuestions: action.questions };

    case "SET_HAIR_ANSWER":
      return { ...state, hairContext: { ...state.hairContext, [action.key]: action.value } };

    case "SET_PHOTO":
      return { ...state, photo: action.file };

    case "CLEAR_PHOTO":
      return { ...state, photo: null };

    case "SET_QUIZ_ANSWER": {
      const quizAnswers = { ...state.quizAnswers, [action.questionId]: action.value };
      const nextIndex = state.quizIndex + 1;

      if (nextIndex >= QUIZ_QUESTION_COUNT) {
        return { ...state, quizAnswers, quizIndex: nextIndex, stepIndex: STEP_ORDER.indexOf("analyzing") };
      }

      const showInterstitial = nextIndex === INTERSTITIAL_AFTER_INDEX && !state.interstitialShown;
      return {
        ...state,
        quizAnswers,
        quizIndex: nextIndex,
        showInterstitial,
        interstitialShown: state.interstitialShown || showInterstitial,
      };
    }

    case "DISMISS_INTERSTITIAL":
      return { ...state, showInterstitial: false };

    case "NEXT": {
      // The quiz step advances one question at a time via SET_QUIZ_ANSWER,
      // not via NEXT — see steps.ts for why it isn't broken into per-question StepIds.
      if (STEP_ORDER[state.stepIndex] === "quiz") return state;
      return { ...state, stepIndex: Math.min(state.stepIndex + 1, STEP_ORDER.length - 1) };
    }

    case "BACK": {
      if (STEP_ORDER[state.stepIndex] === "quiz" && state.quizIndex > 0) {
        return { ...state, quizIndex: state.quizIndex - 1 };
      }
      return { ...state, stepIndex: Math.max(state.stepIndex - 1, 0) };
    }

    case "ANALYSIS_FAILED":
      return { ...state, analysisError: action.message };

    case "RETRY_ANALYSIS":
      return { ...state, analysisError: null, analysisAttempt: state.analysisAttempt + 1 };

    default:
      return state;
  }
}
