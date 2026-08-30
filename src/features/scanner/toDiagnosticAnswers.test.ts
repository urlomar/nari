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
import { scoreProducts } from "@/lib/products/scoring";
import type { Product } from "../../../api/_lib/schema";
import catalogFixture from "@/lib/products/__fixtures__/catalog.json";

const catalog = catalogFixture as Product[];

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

/**
 * Contract test (Spike B, Part B): this is exactly the boundary where a
 * silent break would happen — the quiz and scoring.ts are two separately
 * evolving files that only agree on a shape by convention, not by a shared
 * import. A typo in an answer value, or a scoring.ts union type drifting
 * out of sync with the quiz's real options, wouldn't necessarily fail
 * toDiagnosticAnswers() itself (it's mostly untyped passthrough) — it would
 * only show up here, at the real scoreProducts() call, against real data.
 */
describe("contract: toDiagnosticAnswers() output is accepted by scoreProducts()", () => {
  it("a fully-answered quiz produces a DiagnosticAnswers that scoreProducts() runs against the real catalog without throwing, and returns a well-formed result", () => {
    const answers = toDiagnosticAnswers(fullAnswers);
    expect(() => scoreProducts(answers, catalog)).not.toThrow();

    const result = scoreProducts(answers, catalog);
    // 7, not 6: categories are now derived from the catalog (see
    // scoring.ts's deriveCategories) rather than hardcoded, and the real
    // catalog fixture now includes "Gel" alongside the original 6.
    expect(result.categories).toHaveLength(7);
    for (const category of result.categories) {
      expect(typeof category.category).toBe("string");
      expect(Array.isArray(category.picks)).toBe(true);
      expect(category.picks.length).toBeLessThanOrEqual(3);
      for (const pick of category.picks) {
        expect(catalog.some((p) => p.id === pick.product.id)).toBe(true);
      }
    }
  });

  it("every real quiz option value for every scored dimension round-trips through scoreProducts() without throwing", () => {
    // Exercises every real curl_type/porosity/density/budget/black_owned_pref
    // option the quiz actually offers (see quizQuestions.ts) — not just the
    // one combination fullAnswers happens to use.
    const curlTypes = ["2a2b", "2c3a", "3b3c", "4a", "4b", "4c"];
    const porosities = ["low", "normal", "high", "unsure"];
    const densities = ["fine_low", "fine_high", "medium", "thick_low", "thick_high"];
    const budgets = ["budget", "mid", "premium", "any"];
    const blackOwnedPrefs = ["yes", "mixed", "no_pref"];

    for (const curl_type of curlTypes) {
      for (const porosity of porosities) {
        for (const density of densities) {
          for (const budget of budgets) {
            for (const black_owned_pref of blackOwnedPrefs) {
              const answers = toDiagnosticAnswers({ ...fullAnswers, curl_type, porosity, density, budget, black_owned_pref });
              expect(() => scoreProducts(answers, catalog)).not.toThrow();
            }
          }
        }
      }
    }
  });
});
