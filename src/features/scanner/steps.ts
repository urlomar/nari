import type { HairContext } from "@/lib/schemas";

export type QuestionStepId = "question-naturalState" | "question-product";
export type StepId = "intro" | QuestionStepId | "photo" | "quiz" | "analyzing";

export interface QuestionOption {
  value: string;
  label: string;
}

export interface QuestionStepConfig {
  id: QuestionStepId;
  key: keyof HairContext;
  question: string;
  options: QuestionOption[];
}

export const QUESTION_STEPS: QuestionStepConfig[] = [
  {
    id: "question-naturalState",
    key: "naturalState",
    question: "Is your hair in its natural state right now?",
    options: [
      { value: "natural", label: "Natural" },
      { value: "straightened", label: "Straightened or blow-dried" },
      { value: "protective", label: "Braided or protective style" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "question-product",
    key: "product",
    question: "Any product in your hair right now?",
    options: [
      { value: "none", label: "No product" },
      { value: "light", label: "Light product (leave-in, oil)" },
      { value: "heavy", label: "Heavy product or styled" },
    ],
  },
];

// The 10-question diagnostic quiz. Progress-bar/section-label math below
// assumes this stays fixed at 10 — see ScanProgress.tsx.
export const QUIZ_QUESTION_COUNT = 10;

// One "almost there" interstitial, shown once the user has answered this
// many quiz questions (0-indexed quizIndex reaching this value) — i.e.
// after question 6, before question 7. See ScannerRoute's SET_QUIZ_ANSWER
// handling.
export const INTERSTITIAL_AFTER_INDEX = 6;

// Linear steps before the quiz begins. The quiz itself isn't a single
// StepId per question — QuizStep reads quizIndex off the reducer state —
// so STEP_ORDER only needs to represent it once.
export const STEP_ORDER: StepId[] = ["intro", ...QUESTION_STEPS.map((s) => s.id), "photo", "quiz", "analyzing"];

// Total units the shared progress bar spans: the 2 hair-context questions +
// 1 photo + 10 quiz questions. Intro and the analyzing screen aren't steps
// for progress purposes.
export const TOTAL_PROGRESS_UNITS = QUESTION_STEPS.length + 1 + QUIZ_QUESTION_COUNT;
