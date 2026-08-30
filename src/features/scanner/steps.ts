import { QUIZ_QUESTION_COUNT } from "./quiz/quizQuestions";

export type StepId = "intro" | "photo" | "quiz" | "review" | "analyzing";

// Reordered per the CEO's direction (Final Spike, P2 of 4): the photo now
// comes right after the intro, not after the quiz — she wants it to read as
// a real part of the experience, not an afterthought squeezed in at the
// end. The quiz's 9 questions follow, then a new read-only review screen
// ("review", Part C — replaces the old "profile" step's summary, same
// spirit but no longer positioned before the photo and with different
// copy), then analyzing/results. The old 2 hair-context questions (natural
// state / product in hair) stay dropped: they existed only to disambiguate
// photo analysis for api/analyze.ts, which isn't wired into this flow at
// all — see DECISIONS.md.
//
// To add or reorder a step: add/move its StepId here and in STEP_ORDER,
// add a case to ScannerRoute.tsx's step-dispatch switch, and check
// scannerReducer.ts's BACK/ADVANCE_QUIZ cases for any step-name-specific
// special casing (currently just the quiz<->review boundary) that may need
// to move with it. ScanProgress.tsx's activeSection()/currentUnit() also
// need a matching entry for the new step's progress-bar label/unit.
export const STEP_ORDER: StepId[] = ["intro", "photo", "quiz", "review", "analyzing"];

export { QUIZ_QUESTION_COUNT };

// One "almost there" interstitial, shown once the user has answered this
// many quiz questions (0-indexed quizIndex reaching this value) — i.e.
// after question 6, before question 7. Sits just past Nya's "What are we
// building toward?" phase (questions 5-6) and before "Last few things"
// begins. This is purely about position *within* the 9-question quiz, so
// moving the photo step to before the quiz (P2 of 4) doesn't change
// whether this placement still makes sense — it does, unchanged.
export const INTERSTITIAL_AFTER_INDEX = 6;

// Total units the shared progress bar spans: 9 quiz questions + 1 photo.
// Intro and the analyzing screen aren't steps for progress purposes.
export const TOTAL_PROGRESS_UNITS = QUIZ_QUESTION_COUNT + 1;
