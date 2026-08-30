/**
 * Results-page render tests (Spike B, Part B): empty category, relaxed
 * match, null price, plus the deep-link-with-no-state and all-empty
 * banner edge cases (Part A). Renders against hand-built fixtures rather
 * than the real catalog — these are UI-behavior tests, not scoring tests
 * (scoring.test.ts already covers the engine itself against real data).
 */
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ScanResults from "./ScanResults";
import type { DiagnosticAnswers, RecommendedStyle, ScoredRecommendationSet } from "@/lib/products/scoring";
import type { Product } from "../../api/_lib/schema";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Test Product",
    brand: "Test Brand",
    category: "Shampoo",
    ounces: 8,
    price: 12,
    hairTypes: ["4c"],
    porosity: ["high"],
    density: ["thick"],
    sulfateFree: true,
    siliconeFree: true,
    proteinFree: true,
    fragranceFree: true,
    blackOwned: false,
    mineralOilFree: true,
    ewgScore: null,
    goals: [],
    frustrations: [],
    ...overrides,
  };
}

const nullPriceProduct = makeProduct({
  id: "unpriced",
  name: "Unpriced Shampoo",
  brand: "BrandX",
  price: null,
});

const recommendations: ScoredRecommendationSet = {
  categories: [
    {
      category: "Shampoo",
      picks: [{ product: nullPriceProduct, score: 100, matchReasons: ["porosity: high"] }],
      relaxed: false,
      relaxedConstraints: [],
    },
    {
      category: "Conditioner",
      picks: [
        {
          product: makeProduct({ id: "cond1", name: "Cond Product", brand: "BrandY", category: "Conditioner" }),
          score: 90,
          matchReasons: [],
        },
      ],
      relaxed: true,
      relaxedConstraints: ["density"],
    },
    {
      category: "Leave-in",
      picks: [],
      relaxed: false,
      relaxedConstraints: [],
    },
  ],
  unenforcedSensitivities: [],
  journey: "test",
};

const answers: DiagnosticAnswers = {
  porosity: "high",
  curlType: "4c",
  sensitivities: ["none"],
  goals: [],
  frustrations: [],
  density: "thick_high",
  budgetMax: null,
  blackOwnedPref: "no_pref",
  journey: "test",
};

const styleWithNotes: RecommendedStyle = {
  product: makeProduct({
    id: "style1",
    name: "Wash and Go",
    category: "Style",
    notes: "Not as healthy as a protective style, but great for letting hair breathe.",
    goals: ["moisture"],
    frustrations: ["dryness"],
  }),
  score: 40,
  matchReasons: ["goal: moisture", "frustration #1: dryness"],
};

const styleWithoutNotes: RecommendedStyle = {
  product: makeProduct({
    id: "style2",
    name: "Twist/Braid Out & Rod Set",
    category: "Style",
    notes: undefined,
    goals: ["volume"],
    frustrations: [],
  }),
  score: 26,
  matchReasons: ["goal: volume"],
};

function renderResults(state: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: "/scan/results", state }]}>
      <Routes>
        <Route path="/scan/results" element={<ScanResults />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ScanResults — deep link with no state (Part A edge case)", () => {
  it("shows a graceful recovery card instead of crashing", () => {
    renderResults(null);
    expect(screen.getByText(/couldn.t find your scan results/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start a scan/i })).toBeInTheDocument();
  });

  it("also recovers gracefully when state exists but has no recommendations key", () => {
    renderResults({ answers });
    expect(screen.getByText(/couldn.t find your scan results/i)).toBeInTheDocument();
  });
});

describe("ScanResults — empty category", () => {
  it("keeps the tab visible with a 0 badge and an honest empty message, not a hidden tab", () => {
    renderResults({ recommendations, answers });

    const leaveInTab = screen.getByRole("tab", { name: /Leave-in/i });
    expect(within(leaveInTab).getByText("0")).toBeInTheDocument();

    fireEvent.click(leaveInTab);
    expect(screen.getByText(/no matches in this category yet/i)).toBeInTheDocument();
  });
});

describe("ScanResults — relaxed match", () => {
  it("shows a banner naming exactly what was dropped when the category has picks", () => {
    renderResults({ recommendations, answers });

    fireEvent.click(screen.getByRole("tab", { name: /Conditioner/i }));
    expect(screen.getByText(/closest match.*density/i)).toBeInTheDocument();
  });

  it("does not show the relaxed banner for a category that isn't relaxed", () => {
    renderResults({ recommendations, answers });
    // Shampoo (relaxed: false) is the default active tab.
    expect(screen.queryByText(/closest match/i)).not.toBeInTheDocument();
  });
});

describe("ScanResults — null price", () => {
  it("omits the price line entirely for a null-priced product, never showing $0 or 'null'", () => {
    renderResults({ recommendations, answers });
    // Shampoo is active by default and contains the null-priced product.
    const card = screen.getByText("Unpriced Shampoo").closest("li")!;
    expect(within(card).queryByText(/\$/)).not.toBeInTheDocument();
    expect(card.textContent).not.toMatch(/null/i);
  });
});

describe("ScanResults — match checklist (Part C)", () => {
  it("shows an honest checkmark for a dimension the product actually matches", () => {
    renderResults({ recommendations, answers });
    const card = screen.getByText("Unpriced Shampoo").closest("li")!;
    expect(within(card).getByText(/your porosity/i)).toBeInTheDocument();
  });

  it("degrades gracefully (no checklist, no crash) when answers weren't passed along", () => {
    expect(() => renderResults({ recommendations })).not.toThrow();
  });
});

describe("ScanResults — all categories empty", () => {
  it("shows a page-level banner suggesting the user loosen their filters, not six copies of the per-category message", () => {
    const allEmpty: ScoredRecommendationSet = {
      categories: recommendations.categories.map((c) => ({ ...c, picks: [], relaxed: false, relaxedConstraints: [] })),
      unenforcedSensitivities: [],
      journey: "test",
    };
    renderResults({ recommendations: allEmpty, answers });
    expect(screen.getByText(/very specific/i)).toBeInTheDocument();
  });

  it("does not show the all-empty banner when at least one category has picks", () => {
    renderResults({ recommendations, answers });
    expect(screen.queryByText(/very specific/i)).not.toBeInTheDocument();
  });
});

describe("ScanResults — styles strip (Final Spike, P3 of 4, Part C)", () => {
  it("renders 2 styles with a match line each, and only shows 'Keep in mind' for the one with notes", () => {
    renderResults({
      recommendations: { ...recommendations, styles: [styleWithNotes, styleWithoutNotes] },
      answers,
    });

    expect(screen.getByText("Wash and Go")).toBeInTheDocument();
    expect(screen.getByText(/matches your deep moisture goal and helps with constant dryness/i)).toBeInTheDocument();
    expect(screen.getByText(/keep in mind/i)).toBeInTheDocument();

    expect(screen.getByText("Twist/Braid Out & Rod Set")).toBeInTheDocument();
    const noNotesCard = screen.getByText("Twist/Braid Out & Rod Set").closest("li")!;
    expect(within(noNotesCard).queryByText(/keep in mind/i)).not.toBeInTheDocument();
  });

  it("renders cleanly with just 1 style", () => {
    renderResults({ recommendations: { ...recommendations, styles: [styleWithNotes] }, answers });
    expect(screen.getByText("Wash and Go")).toBeInTheDocument();
    expect(screen.queryByText("Twist/Braid Out & Rod Set")).not.toBeInTheDocument();
  });

  it("renders nothing at all — not an empty state — when there are 0 styles", () => {
    renderResults({ recommendations: { ...recommendations, styles: [] }, answers });
    expect(screen.queryByText(/styles worth trying/i)).not.toBeInTheDocument();
  });

  it("also renders nothing when styles is entirely absent (older cached history entry)", () => {
    renderResults({ recommendations, answers });
    expect(screen.queryByText(/styles worth trying/i)).not.toBeInTheDocument();
  });
});

describe("ScanResults — profile summary line (final copy pass)", () => {
  it("names the goal and the top frustration with distinct verbs, matching the spec example", () => {
    renderResults({
      recommendations,
      answers: { ...answers, goals: ["definition"], frustrations: ["dryness"] },
    });
    expect(
      screen.getByText("Chosen to support your curl definition goal and help with constant dryness.")
    ).toBeInTheDocument();
  });

  it("caps displayed goals at 2 (of 3 selected) and pluralizes ‘goals’", () => {
    renderResults({
      recommendations,
      answers: { ...answers, goals: ["moisture", "definition", "frizz"], frustrations: ["dryness"] },
    });
    // The exact-string match above already proves the third goal (frizz
    // control) isn't in the sentence; it still legitimately appears in the
    // (uncapped) profile chip row below, so no negative assertion here.
    expect(
      screen.getByText(
        "Chosen to support your deep moisture and curl definition goals and help with constant dryness."
      )
    ).toBeInTheDocument();
  });

  it("drops the frustration clause entirely (not dangling) when the user picked ‘nothing’", () => {
    renderResults({
      recommendations,
      answers: { ...answers, goals: ["moisture"], frustrations: ["nothing"] },
    });
    expect(screen.getByText("Chosen to support your deep moisture goal.")).toBeInTheDocument();
    expect(screen.queryByText(/honestly doing okay/i)).not.toBeInTheDocument();
  });

  it("drops the frustration clause when nothing was ranked at all", () => {
    renderResults({
      recommendations,
      answers: { ...answers, goals: ["moisture"], frustrations: [] },
    });
    expect(screen.getByText("Chosen to support your deep moisture goal.")).toBeInTheDocument();
  });
});

describe("ScanResults — privacy line copy", () => {
  it("uses 'and are never' instead of an em dash", () => {
    renderResults({ recommendations, answers });
    expect(
      screen.getByText("Your answers are used only to build these recommendations and are never stored or shared.")
    ).toBeInTheDocument();
  });
});
