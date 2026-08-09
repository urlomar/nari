import type { DiagnosticAnswers } from "@/lib/products/scoring";
import type { QuizAnswers } from "./quiz/quizTypes";

/**
 * Maps the raw answer bag the quiz collects (QuizAnswers — single strings
 * for single-select questions, string arrays for multi/ranked) into the
 * shape src/lib/products/scoring.ts's scoreProducts() expects. Prompt 4
 * will call scoreProducts() for real; this prompt only needs this function
 * to exist and typecheck against DiagnosticAnswers (see this function's
 * return type annotation below) — scoreProducts() itself is not called
 * here or anywhere else yet.
 *
 * Every field except budgetMax is a direct passthrough: curl type,
 * porosity, density, goals, frustrations, sensitivities, and
 * blackOwnedPref's values were all written to match scoring.ts's expected
 * literals exactly (see quizQuestions.ts and DECISIONS.md) — the quiz
 * never invents its own vocabulary that then needs translating.
 */

/** Confirmed against DECISIONS.md's Prompt 3 mapping: budget→10, mid→25, premium→50, any→no ceiling. */
const BUDGET_MAX_BY_BUCKET: Record<string, number | null> = {
  budget: 10,
  mid: 25,
  premium: 50,
  any: null,
};

function single(answers: QuizAnswers, id: string): string {
  const value = answers[id];
  return typeof value === "string" ? value : "";
}

function multi(answers: QuizAnswers, id: string): string[] {
  const value = answers[id];
  return Array.isArray(value) ? value : [];
}

export function toDiagnosticAnswers(answers: QuizAnswers): DiagnosticAnswers {
  return {
    porosity: (single(answers, "porosity") || "unsure") as DiagnosticAnswers["porosity"],
    curlType: single(answers, "curl_type"),
    sensitivities: multi(answers, "sensitivities") as DiagnosticAnswers["sensitivities"],
    goals: multi(answers, "goals") as DiagnosticAnswers["goals"],
    frustrations: multi(answers, "frustrations") as DiagnosticAnswers["frustrations"],
    density: single(answers, "density") as DiagnosticAnswers["density"],
    budgetMax: BUDGET_MAX_BY_BUCKET[single(answers, "budget")] ?? null,
    blackOwnedPref: single(answers, "black_owned_pref") as DiagnosticAnswers["blackOwnedPref"],
    journey: single(answers, "journey"),
  };
}
