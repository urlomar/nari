/**
 * Tests for the scoring engine (scoring.ts). The two required profiles
 * (Demanding, Easy) run against the REAL catalog shape — a fixture copied
 * verbatim from a live /api/products fetch on 2026-08-07
 * (__fixtures__/catalog.json, 50 products) — not invented data, so these
 * tests catch real gaps in the live catalog (e.g. no 2A/2B/2C products
 * exist yet) rather than only ever exercising a convenient fake dataset.
 *
 * A few guarantees (budget ordering, brand-diversity cap, the "no
 * alternative" cap-relaxation case) are instead tested against small,
 * synthetic, tightly-controlled product sets — real data can't reliably
 * offer a clean, unambiguous example of "all else equal except X," so
 * these isolate one variable at a time on purpose.
 */
import { describe, it, expect } from "vitest";
import { scoreProducts, type DiagnosticAnswers } from "./scoring";
import type { Product } from "../../../api/_lib/schema";
import catalogFixture from "./__fixtures__/catalog.json";

const catalog = catalogFixture as Product[];

const baseAnswers: DiagnosticAnswers = {
  porosity: "unsure",
  curlType: "",
  sensitivities: ["none"],
  goals: [],
  frustrations: [],
  density: "medium",
  budgetMax: null,
  blackOwnedPref: "no_pref",
  journey: "test",
};

const demandingAnswers: DiagnosticAnswers = {
  ...baseAnswers,
  porosity: "high",
  curlType: "4c",
  sensitivities: ["protein"],
  goals: ["moisture", "definition"],
  frustrations: ["breakage"],
  density: "thick_high",
  budgetMax: 10,
};

const easyAnswers: DiagnosticAnswers = {
  ...baseAnswers,
  porosity: "normal",
  curlType: "2c3a",
  sensitivities: ["none"],
  goals: ["moisture", "definition"],
  frustrations: [],
  density: "medium",
  budgetMax: null,
};

function printResult(label: string, result: ReturnType<typeof scoreProducts>) {
  console.log(`\n=== ${label} ===`);
  console.log("unenforcedSensitivities:", result.unenforcedSensitivities);
  for (const category of result.categories) {
    console.log(
      `\n${category.category}${category.relaxed ? ` (relaxed: ${category.relaxedConstraints.join(", ")})` : ""}`
    );
    for (const pick of category.picks) {
      console.log(
        `  [${pick.score.toFixed(1)}] ${pick.product.brand} — ${pick.product.name} (${pick.matchReasons.join("; ")})`
      );
    }
  }
}

describe("scoreProducts — Demanding profile (4C, high porosity, protein-sensitive, under $10, thick, #1 frustration breakage)", () => {
  const result = scoreProducts(demandingAnswers, catalog);
  printResult("Demanding", result);

  it("never returns a product that isn't positively marked protein-free", () => {
    for (const category of result.categories) {
      for (const pick of category.picks) {
        expect(pick.product.proteinFree).toBe(true);
      }
    }
  });

  // Real, documented catalog gap (see DECISIONS.md "Open questions"):
  // Mousse and Oil/Sealant currently have ZERO protein-free products in
  // the whole catalog (0/6 and 0/4). Relaxation can never fix this —
  // relaxation only ever touches density/curlType/porosity, never
  // sensitivities, by design (Stage 1's exclusions are final). So "no
  // category is empty" can only hold when the sensitivity-filtered
  // catalog actually has *something* in that category to begin with —
  // this test asserts that real, narrower guarantee, and separately pins
  // down which categories are currently empty for this profile so a
  // silent regression (e.g. a category that DOES have eligible products
  // suddenly returning nothing) still fails loudly.
  it("returns picks for every category that has at least one protein-free product in the catalog", () => {
    const proteinFreeCategoriesWithStock = new Set(catalog.filter((p) => p.proteinFree).map((p) => p.category));
    for (const category of result.categories) {
      if (proteinFreeCategoriesWithStock.has(category.category)) {
        expect(category.picks.length).toBeGreaterThan(0);
      } else {
        expect(category.picks.length).toBe(0);
      }
    }
  });

  it("known gap: Mousse and Oil/Sealant are currently empty for protein-sensitive users (0 protein-free products in either)", () => {
    const mousse = result.categories.find((c) => c.category === "Mousse")!;
    const oilSealant = result.categories.find((c) => c.category === "Oil/Sealant")!;
    expect(mousse.picks.length).toBe(0);
    expect(oilSealant.picks.length).toBe(0);
  });

  it("sets relaxation flags honestly (relaxedConstraints non-empty whenever relaxed is true)", () => {
    for (const category of result.categories) {
      expect(category.relaxed).toBe(category.relaxedConstraints.length > 0);
    }
  });
});

describe("scoreProducts — Easy profile (2C/3A, normal porosity, no sensitivities, price no factor, medium density)", () => {
  const result = scoreProducts(easyAnswers, catalog);
  printResult("Easy", result);

  it("has at least one pick in every category", () => {
    for (const category of result.categories) {
      expect(category.picks.length).toBeGreaterThan(0);
    }
  });

  it("never excludes anything on sensitivities (none were reported)", () => {
    expect(result.unenforcedSensitivities).toEqual([]);
  });
});

describe("scoreProducts — brand diversity", () => {
  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: "test-id",
      name: "Test Product",
      brand: "Test Brand",
      category: "Shampoo",
      ounces: 8,
      price: 15,
      hairTypes: [],
      porosity: [],
      density: [],
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

  it("prefers brand diversity over raw score within a category when an alternative exists", () => {
    const products = [
      makeProduct({ id: "a1", brand: "BrandA", ewgScore: 1 }),
      makeProduct({ id: "a2", brand: "BrandA", ewgScore: 2 }),
      makeProduct({ id: "a3", brand: "BrandA", ewgScore: 3 }),
      makeProduct({ id: "b1", brand: "BrandB", ewgScore: 9 }), // lowest raw score of the four
    ];
    const result = scoreProducts(baseAnswers, products);
    const shampoo = result.categories.find((c) => c.category === "Shampoo")!;
    const ids = shampoo.picks.map((p) => p.product.id);

    // A plain top-3-by-score would be [a1, a2, a3], excluding b1 entirely.
    expect(ids).toContain("b1");
    expect(new Set(shampoo.picks.map((p) => p.product.brand)).size).toBeGreaterThan(1);
  });

  it("allows repeat brands to fill the category when there is no alternative", () => {
    const products = [
      makeProduct({ id: "a1", brand: "BrandA" }),
      makeProduct({ id: "a2", brand: "BrandA" }),
      makeProduct({ id: "a3", brand: "BrandA" }),
    ];
    const result = scoreProducts(baseAnswers, products);
    const shampoo = result.categories.find((c) => c.category === "Shampoo")!;
    expect(shampoo.picks.length).toBe(3);
  });
});

describe("scoreProducts — budget is soft, never a hard filter", () => {
  function makeProduct(overrides: Partial<Product> = {}): Product {
    return {
      id: "test-id",
      name: "Test Product",
      brand: "Test Brand",
      category: "Shampoo",
      ounces: 8,
      price: 15,
      hairTypes: [],
      porosity: [],
      density: [],
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

  it("ranks an in-budget product above an otherwise-identical out-of-budget one", () => {
    const inBudget = makeProduct({ id: "in", price: 8 });
    const outOfBudget = makeProduct({ id: "out", price: 40 });
    const result = scoreProducts({ ...baseAnswers, budgetMax: 10 }, [inBudget, outOfBudget]);
    const shampoo = result.categories.find((c) => c.category === "Shampoo")!;
    const inPick = shampoo.picks.find((p) => p.product.id === "in")!;
    const outPick = shampoo.picks.find((p) => p.product.id === "out")!;
    expect(inPick.score).toBeGreaterThan(outPick.score);
  });

  it("never excludes a null-priced product outright", () => {
    const nullPriced = makeProduct({ id: "null-price", price: null });
    const result = scoreProducts({ ...baseAnswers, budgetMax: 10 }, [nullPriced]);
    const shampoo = result.categories.find((c) => c.category === "Shampoo")!;
    expect(shampoo.picks.map((p) => p.product.id)).toContain("null-price");
  });
});

describe("scoreProducts — mineral_oil sensitivity (no catalog column yet)", () => {
  it("flags mineral_oil as unenforced rather than silently ignoring it", () => {
    const result = scoreProducts({ ...baseAnswers, sensitivities: ["mineral_oil"] }, catalog);
    expect(result.unenforcedSensitivities).toEqual(["mineral_oil"]);
  });

  it("does not exclude any product on mineral_oil (nothing to check it against)", () => {
    const withFilter = scoreProducts({ ...baseAnswers, sensitivities: ["mineral_oil"] }, catalog);
    const withoutFilter = scoreProducts({ ...baseAnswers, sensitivities: ["none"] }, catalog);
    const totalPicksWith = withFilter.categories.reduce((sum, c) => sum + c.picks.length, 0);
    const totalPicksWithout = withoutFilter.categories.reduce((sum, c) => sum + c.picks.length, 0);
    expect(totalPicksWith).toBe(totalPicksWithout);
  });
});

describe("scoreProducts — relaxation (real catalog gap: no 2A/2B/2C products exist yet)", () => {
  it("relaxes curl type when the catalog has no matching tags", () => {
    const answers: DiagnosticAnswers = { ...baseAnswers, curlType: "2a2b" };
    const result = scoreProducts(answers, catalog);
    const anyRelaxedCurlType = result.categories.some((c) => c.relaxedConstraints.includes("curlType"));
    expect(anyRelaxedCurlType).toBe(true);
  });

  it("never relaxes a sensitivity exclusion, even under relaxation", () => {
    const answers: DiagnosticAnswers = { ...baseAnswers, curlType: "2a2b", sensitivities: ["protein"] };
    const result = scoreProducts(answers, catalog);
    for (const category of result.categories) {
      for (const pick of category.picks) {
        expect(pick.product.proteinFree).toBe(true);
      }
    }
  });
});
