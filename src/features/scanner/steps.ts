import { QUIZ_QUESTION_COUNT } from "./quiz/quizQuestions";

export type StepId = "intro" | "quiz" | "photo" | "analyzing";

// The quiz now comes first (Nya's 9 questions), then the photo — matching
// her "answer questions, then upload a photo" flow. The old 2 hair-context
// questions (natural state / product in hair) are dropped: they existed
// only to disambiguate photo analysis for api/analyze.ts, which isn't
// wired into this flow at all — see DECISIONS.md.
export const STEP_ORDER: StepId[] = ["intro", "quiz", "photo", "analyzing"];

export { QUIZ_QUESTION_COUNT };

// One "almost there" interstitial, shown once the user has answered this
// many quiz questions (0-indexed quizIndex reaching this value) — i.e.
// after question 6, before question 7. Repositioned from the old
// 10-question quiz's midpoint to sit just past Nya's "What are we building
// toward?" phase (questions 5-6) and before "Last few things" begins.
export const INTERSTITIAL_AFTER_INDEX = 6;

// Total units the shared progress bar spans: 9 quiz questions + 1 photo.
// Intro and the analyzing screen aren't steps for progress purposes.
export const TOTAL_PROGRESS_UNITS = QUIZ_QUESTION_COUNT + 1;
