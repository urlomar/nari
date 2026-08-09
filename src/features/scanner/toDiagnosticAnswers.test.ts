/**
 * Confirms the quiz's raw answer bag converts cleanly into scoring.ts's
 * DiagnosticAnswers shape — the two literals Prompt 2 flagged as inferred
 * (budgetMax's bucket mapping, blackOwnedPref's casing) get their own
 * assertions. Deliberately does NOT call scoreProducts() — wiring the real
 * quiz into scoring is Prompt 4's job (see CLAUDE.md).
 */
import { describe, it, expect } from "vitest";
import { toDiagnosticAnswers } from "./toDiagnosticAnswers";
import type { QuizAnswers } from "./quiz/quizTypes";

const fullAnswers: QuizAnswers = {
  journey: "natural_established",
  curl_type: "4c",
  porosity: "high",
  density: "thick_high",
  goals: ["moisture", "definition"],
  frustrations: ["breakage", "dryness"],
  sensitivities: ["protein", "sulfates"],
  budget: "mid",
  black_owned_pref: "yes",
};

describe("toDiagnosticAnswers", () => {
  it("maps every budget bucket to its confirmed dollar ceiling", () => {
    expect(toDiagnosticAnswers({ ...fullAnswers, budget: "budget" }).budgetMax).toBe(10);
    expect(toDiagnosticAnswers({ ...fullAnswers, budget: "mid" }).budgetMax).toBe(25);
    expect(toDiagnosticAnswers({ ...fullAnswers, budget: "premium" }).budgetMax).toBe(50);
    expect(toDiagnosticAnswers({ ...fullAnswers, budget: "any" }).budgetMax).toBeNull();
  });

  it("passes blackOwnedPref through with the quiz's own casing (yes / mixed / no_pref)", () => {
    expect(toDiagnosticAnswers({ ...fullAnswers, black_owned_pref: "yes" }).blackOwnedPref).toBe("yes");
    expect(toDiagnosticAnswers({ ...fullAnswers, black_owned_pref: "mixed" }).blackOwnedPref).toBe("mixed");
    expect(toDiagnosticAnswers({ ...fullAnswers, black_owned_pref: "no_pref" }).blackOwnedPref).toBe("no_pref");
  });

  it("passes multi/ranked array answers through untouched", () => {
    const result = toDiagnosticAnswers(fullAnswers);
    expect(result.goals).toEqual(["moisture", "definition"]);
    expect(result.frustrations).toEqual(["breakage", "dryness"]);
    expect(result.sensitivities).toEqual(["protein", "sulfates"]);
  });

  it("defaults porosity to 'unsure' when unanswered, matching the dimension's own skip behavior", () => {
    const { porosity, ...rest } = fullAnswers;
    void porosity;
    expect(toDiagnosticAnswers(rest).porosity).toBe("unsure");
  });
});
