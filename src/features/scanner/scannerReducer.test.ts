/**
 * Spike B, Part A: "network drops mid-flow, answers preserved, resumable"
 * rests entirely on this file's sessionStorage read/write/restore path.
 * The brief specifically asked to verify this actually works rather than
 * assume it — these tests walk the real failure paths: a normal
 * write-then-restore, a corrupted blob, and an empty/missing one.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  QUIZ_PROGRESS_STORAGE_KEY,
  clearPersistedQuizProgress,
  createInitialScannerState,
  scannerReducer,
  writePersistedQuizProgress,
} from "./scannerReducer";
import { STEP_ORDER, QUIZ_QUESTION_COUNT } from "./steps";
import type { QuizAnswers } from "./quiz/quizTypes";

beforeEach(() => {
  sessionStorage.clear();
});

describe("createInitialScannerState — resuming from sessionStorage", () => {
  it("starts at the intro step with no progress when nothing was ever written", () => {
    const state = createInitialScannerState();
    expect(state.stepIndex).toBe(0);
    expect(state.quizAnswers).toEqual({});
  });

  it("restores mid-quiz answers and position after a simulated refresh", () => {
    const answers: QuizAnswers = { journey: "natural_established", curl_type: "4c" };
    writePersistedQuizProgress({ quizAnswers: answers, quizIndex: 2, interstitialShown: false });

    const restored = createInitialScannerState();
    expect(restored.stepIndex).toBe(STEP_ORDER.indexOf("quiz"));
    expect(restored.quizAnswers).toEqual(answers);
    expect(restored.quizIndex).toBe(2);
  });

  it("does not restore (starts fresh) when the persisted answers object is empty", () => {
    writePersistedQuizProgress({ quizAnswers: {}, quizIndex: 0, interstitialShown: false });
    const restored = createInitialScannerState();
    expect(restored.stepIndex).toBe(0);
  });

  it("does not throw and falls back to a fresh state when sessionStorage holds corrupted JSON", () => {
    sessionStorage.setItem(QUIZ_PROGRESS_STORAGE_KEY, "{not valid json");
    expect(() => createInitialScannerState()).not.toThrow();
    const restored = createInitialScannerState();
    expect(restored.stepIndex).toBe(0);
    expect(restored.quizAnswers).toEqual({});
  });

  it("clearPersistedQuizProgress actually removes the blob (a later restore starts fresh)", () => {
    writePersistedQuizProgress({ quizAnswers: { journey: "always_natural" }, quizIndex: 0, interstitialShown: false });
    clearPersistedQuizProgress();
    const restored = createInitialScannerState();
    expect(restored.stepIndex).toBe(0);
    expect(restored.quizAnswers).toEqual({});
  });
});

describe("scannerReducer — navigation around the quiz/profile boundary", () => {
  it("ADVANCE_QUIZ past the last question moves to the profile step", () => {
    const state = { ...createInitialScannerState(), stepIndex: STEP_ORDER.indexOf("quiz"), quizIndex: QUIZ_QUESTION_COUNT - 1 };
    const next = scannerReducer(state, { type: "ADVANCE_QUIZ" });
    expect(next.stepIndex).toBe(STEP_ORDER.indexOf("profile"));
  });

  it("BACK from the profile step returns to the quiz's last question, not stepIndex - 1 blindly", () => {
    const state = { ...createInitialScannerState(), stepIndex: STEP_ORDER.indexOf("profile"), quizIndex: QUIZ_QUESTION_COUNT };
    const next = scannerReducer(state, { type: "BACK" });
    expect(next.stepIndex).toBe(STEP_ORDER.indexOf("quiz"));
    expect(next.quizIndex).toBe(QUIZ_QUESTION_COUNT - 1);
  });

  it("RESET clears all progress back to the intro step", () => {
    const state = {
      ...createInitialScannerState(),
      stepIndex: STEP_ORDER.indexOf("profile"),
      quizAnswers: { journey: "always_natural" },
    };
    const next = scannerReducer(state, { type: "RESET" });
    expect(next.stepIndex).toBe(0);
    expect(next.quizAnswers).toEqual({});
  });

  it("SET_QUIZ_ANSWER records the answer without advancing quizIndex", () => {
    const state = createInitialScannerState();
    const next = scannerReducer(state, { type: "SET_QUIZ_ANSWER", questionId: "journey", value: "always_natural" });
    expect(next.quizAnswers.journey).toBe("always_natural");
    expect(next.quizIndex).toBe(state.quizIndex);
  });
});
