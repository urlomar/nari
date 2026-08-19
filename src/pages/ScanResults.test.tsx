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
import type { DiagnosticAnswers, ScoredRecommendationSet } from "@/lib/products/scoring";
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
