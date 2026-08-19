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
import {
  scoreProducts,
  scoreProductBreakdown,
  debugHardFilterExclusions,
  buildMatchChecklist,
  SENSITIVITY_VALUES,
  type DiagnosticAnswers,
} from "./scoring";
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

// ---------------------------------------------------------------------------
// Spike B, Part B — guarantee tests. These assert invariants that must hold
// for ANY answer/catalog combination, not just the two required profiles —
// the kind of thing that fails silently (a quietly-wrong recommendation)
// rather than loudly, which is exactly what's worth guarding here.
// ---------------------------------------------------------------------------

describe("scoreProducts — porosity is honest when not relaxed", () => {
  it("a low-porosity user never gets a product tagged only for high porosity, and vice versa (real catalog)", () => {
    const low = scoreProducts({ ...baseAnswers, porosity: "low" }, catalog);
    for (const category of low.categories) {
      if (category.relaxedConstraints.includes("porosity")) continue;
      for (const pick of category.picks) {
        expect(pick.product.porosity).toContain("low");
        expect(pick.product.porosity).not.toEqual(["high"]);
      }
    }

    const high = scoreProducts({ ...baseAnswers, porosity: "high" }, catalog);
    for (const category of high.categories) {
      if (category.relaxedConstraints.includes("porosity")) continue;
      for (const pick of category.picks) {
        expect(pick.product.porosity).toContain("high");
        expect(pick.product.porosity).not.toEqual(["low"]);
      }
    }
  });

  it("controlled case: a product tagged only 'high' is never picked for a 'low' porosity user, and vice versa", () => {
    function makeProduct(overrides: Partial<Product>): Product {
      return {
        id: overrides.id ?? "id",
        name: "Test",
        brand: overrides.brand ?? "Brand",
        category: "Shampoo",
        ounces: 8,
        price: 15,
        hairTypes: [],
        porosity: [],
        density: ["medium"],
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
    const highOnly = makeProduct({ id: "high-only", brand: "A", porosity: ["high"] });
    const lowOnly = makeProduct({ id: "low-only", brand: "B", porosity: ["low"] });

    const lowUser = scoreProducts({ ...baseAnswers, porosity: "low", density: "medium" }, [highOnly, lowOnly]);
    const lowShampoo = lowUser.categories.find((c) => c.category === "Shampoo")!;
    if (!lowShampoo.relaxedConstraints.includes("porosity")) {
      expect(lowShampoo.picks.map((p) => p.product.id)).not.toContain("high-only");
    }

    const highUser = scoreProducts({ ...baseAnswers, porosity: "high", density: "medium" }, [highOnly, lowOnly]);
    const highShampoo = highUser.categories.find((c) => c.category === "Shampoo")!;
    if (!highShampoo.relaxedConstraints.includes("porosity")) {
      expect(highShampoo.picks.map((p) => p.product.id)).not.toContain("low-only");
    }
  });
});

describe("scoreProducts — no product violating a stated sensitivity ever appears", () => {
  const sensitivityToField: Record<string, keyof Product> = {
    protein: "proteinFree",
    sulfates: "sulfateFree",
    silicones: "siliconeFree",
    fragrance: "fragranceFree",
  };

  for (const sensitivity of SENSITIVITY_VALUES) {
    if (sensitivity === "none" || sensitivity === "mineral_oil") continue; // mineral_oil has its own dedicated tests below
    it(`never returns a product that fails the "${sensitivity}" filter (real catalog)`, () => {
      const result = scoreProducts({ ...baseAnswers, sensitivities: [sensitivity] }, catalog);
      const field = sensitivityToField[sensitivity];
      for (const category of result.categories) {
        for (const pick of category.picks) {
          expect(pick.product[field]).toBe(true);
        }
      }
    });
  }

  it("combining multiple sensitivities never returns a product violating any of them", () => {
    const result = scoreProducts({ ...baseAnswers, sensitivities: ["protein", "sulfates", "silicones"] }, catalog);
    for (const category of result.categories) {
      for (const pick of category.picks) {
        expect(pick.product.proteinFree).toBe(true);
        expect(pick.product.sulfateFree).toBe(true);
        expect(pick.product.siliconeFree).toBe(true);
      }
    }
  });
});

describe("scoreProducts — every returned product exists in the catalog (no fabrication)", () => {
  it.each([
    ["Demanding", demandingAnswers],
    ["Easy", easyAnswers],
    ["baseline", baseAnswers],
  ])("%s profile: every picked product id is present in the input catalog", (_label, answers) => {
    const catalogIds = new Set(catalog.map((p) => p.id));
    const result = scoreProducts(answers, catalog);
    for (const category of result.categories) {
      for (const pick of category.picks) {
        expect(catalogIds.has(pick.product.id)).toBe(true);
        // Not just the id — the whole object must be a reference from the
        // catalog, never a synthesized/partial one.
        expect(catalog).toContain(pick.product);
      }
    }
  });
});

describe("scoreProducts — relaxation order is always density -> curlType -> porosity, never sensitivities", () => {
  it("relaxedConstraints is always a prefix of [density, curlType, porosity], across many trigger scenarios", () => {
    const order = ["density", "curlType", "porosity"];
    const scenarios: DiagnosticAnswers[] = [
      { ...baseAnswers, curlType: "2a2b", porosity: "high", density: "thick_high" },
      { ...baseAnswers, curlType: "2c3a", porosity: "normal", density: "medium" },
      { ...baseAnswers, curlType: "3b3c", porosity: "low", density: "fine_low" },
      { ...baseAnswers, curlType: "nonexistent-tag", porosity: "high", density: "thick_high", sensitivities: ["protein", "sulfates"] },
    ];
    for (const answers of scenarios) {
      const result = scoreProducts(answers, catalog);
      for (const category of result.categories) {
        const constraints = category.relaxedConstraints;
        expect(order.slice(0, constraints.length)).toEqual(constraints);
        // TypeScript's type already prevents a sensitivity value here, but
        // assert it at runtime too — this is the guarantee that actually matters.
        for (const c of constraints) expect(["density", "curlType", "porosity"]).toContain(c);
      }
    }
  });
});

describe("scoreProducts — ranking is deterministic", () => {
  it("identical answers and catalog (fresh object references) produce identical output", () => {
    const answersA: DiagnosticAnswers = { ...demandingAnswers, goals: [...demandingAnswers.goals], frustrations: [...demandingAnswers.frustrations], sensitivities: [...demandingAnswers.sensitivities] };
    const answersB: DiagnosticAnswers = { ...demandingAnswers, goals: [...demandingAnswers.goals], frustrations: [...demandingAnswers.frustrations], sensitivities: [...demandingAnswers.sensitivities] };
    const catalogCopy = catalog.map((p) => ({ ...p }));

    const resultA = scoreProducts(answersA, catalog);
    const resultB = scoreProducts(answersB, catalogCopy);

    expect(resultA.categories.map((c) => ({ category: c.category, ids: c.picks.map((p) => p.product.id), scores: c.picks.map((p) => p.score) }))).toEqual(
      resultB.categories.map((c) => ({ category: c.category, ids: c.picks.map((p) => p.product.id), scores: c.picks.map((p) => p.score) }))
    );
  });

  it("running the same call twice in a row gives byte-identical picks order", () => {
    const first = scoreProducts(easyAnswers, catalog);
    const second = scoreProducts(easyAnswers, catalog);
    expect(first).toEqual(second);
  });
});

describe("scoreProductBreakdown — per-dimension breakdown sums to the same total scoreProducts() uses", () => {
  it("breakdown's total matches the score scoreProducts() assigns the same product", () => {
    const result = scoreProducts(demandingAnswers, catalog);
    const shampoo = result.categories.find((c) => c.category === "Shampoo")!;
    for (const pick of shampoo.picks) {
      const breakdown = scoreProductBreakdown(pick.product, demandingAnswers);
      expect(breakdown.total).toBeCloseTo(pick.score, 5);
      const summed =
        breakdown.porosity +
        breakdown.curlType +
        breakdown.goals +
        breakdown.frustrations +
        breakdown.density +
        breakdown.budget +
        breakdown.blackOwned +
        breakdown.tiebreakers;
      expect(breakdown.total).toBeCloseTo(summed, 5);
    }
  });
});

describe("debugHardFilterExclusions", () => {
  it("excludes exactly the products scoreProducts() would exclude via hard filters, and no others", () => {
    const sensitivities: DiagnosticAnswers["sensitivities"] = ["protein"];
    const exclusions = debugHardFilterExclusions(catalog, sensitivities);
    const excludedIds = new Set(exclusions.map((e) => e.product.id));

    for (const product of catalog) {
      if (excludedIds.has(product.id)) {
        expect(product.proteinFree).toBe(false);
        expect(exclusions.find((e) => e.product.id === product.id)!.failedSensitivities).toContain("protein");
      } else {
        expect(product.proteinFree).toBe(true);
      }
    }
  });

  it("returns nothing when the user reported no sensitivities", () => {
    expect(debugHardFilterExclusions(catalog, ["none"])).toEqual([]);
  });
});

describe("buildMatchChecklist", () => {
  const product = catalog.find((p) => p.proteinFree && p.porosity.length > 0)!;

  it("omits a dimension the user didn't express a preference on", () => {
    const items = buildMatchChecklist(product, baseAnswers, []); // baseAnswers: porosity unsure, curlType "", budgetMax null, blackOwnedPref no_pref, sensitivities none
    expect(items).toEqual([]);
  });

  it("includes a sensitivities row (always matched) when the user reported one that was enforced", () => {
    const items = buildMatchChecklist(product, { ...baseAnswers, sensitivities: ["protein"] }, []);
    const sensitivityItem = items.find((i) => i.key === "sensitivities");
    expect(sensitivityItem).toBeDefined();
    expect(sensitivityItem!.matched).toBe(true);
  });

  it("omits the sensitivities row entirely when that sensitivity is unenforced (never a false green check)", () => {
    const items = buildMatchChecklist(product, { ...baseAnswers, sensitivities: ["mineral_oil"] }, ["mineral_oil"]);
    expect(items.find((i) => i.key === "sensitivities")).toBeUndefined();
  });

  it("reports an honest mismatch (matched: false) rather than omitting the row when the product doesn't qualify", () => {
    const cheapProduct = catalog.find((p) => p.price !== null && p.price > 5)!;
    const items = buildMatchChecklist(cheapProduct, { ...baseAnswers, budgetMax: 1 }, []);
    const budgetItem = items.find((i) => i.key === "budget");
    expect(budgetItem).toBeDefined();
    expect(budgetItem!.matched).toBe(false);
  });

  it("omits the black-owned row when the user expressed no preference", () => {
    const items = buildMatchChecklist(product, { ...baseAnswers, blackOwnedPref: "no_pref" }, []);
    expect(items.find((i) => i.key === "blackOwned")).toBeUndefined();
  });

  it("includes the black-owned row when the user expressed a preference, honestly reflecting the product", () => {
    const nonBlackOwnedProduct = catalog.find((p) => !p.blackOwned)!;
    const items = buildMatchChecklist(nonBlackOwnedProduct, { ...baseAnswers, blackOwnedPref: "yes" }, []);
    const item = items.find((i) => i.key === "blackOwned");
    expect(item).toBeDefined();
    expect(item!.matched).toBe(false);
  });
});
