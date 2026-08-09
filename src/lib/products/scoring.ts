/**
 * Product recommendation scoring engine.
 *
 * Turns a completed diagnostic quiz answer set plus the normalized product
 * catalog (see api/_lib/schema.ts's `Product`) into ranked picks per
 * category. This is a **pure function** — no network calls, no React, no
 * side effects, same inputs always produce the same output — specifically
 * so it's fast to unit test and fast to tune (all weights live in one
 * config object below; nothing else in this file should need to change to
 * retune priorities).
 *
 * Matching is deterministic tag comparison against Airtable's own fields,
 * not an LLM call — see DECISIONS.md for why (speed, cost, determinism,
 * no hallucinated products).
 *
 * --- On the `DiagnosticAnswers` / `ScoredRecommendationSet` types below ---
 * The brief for this prompt described the signature as
 * `scoreProducts(answers: QuizAnswers, catalog: Product[]): RecommendationSet`.
 * `QuizAnswers` and `RecommendationSet` already exist in src/lib/schemas.ts,
 * but they belong to the OLD placeholder quiz/mock flow (`QuizAnswers` is a
 * flat `Record<string,string>`; `RecommendationSet` has no room for ranked
 * frustrations, match reasons, relaxation flags, or the unenforced-
 * sensitivity flag this prompt requires) and Prompt 3 hasn't ported the
 * real 9-question quiz yet, so there's no confirmed source of truth for
 * exact answer-value strings beyond what THIS prompt specifies directly.
 * Extending those old types in place would either break `getRecommendations()`
 * (explicitly out of scope this prompt) or silently paper over a shape
 * mismatch. So this file defines its own purpose-built `DiagnosticAnswers`
 * (input) and `ScoredRecommendationSet` (output) types instead — Prompt 3
 * needs to produce a `DiagnosticAnswers` from the real quiz UI, and Prompt 4
 * consumes `ScoredRecommendationSet` in place of the old mock
 * `RecommendationSet`. See DECISIONS.md for the two literals (`budgetMax`,
 * `blackOwnedPref`) that were inferred rather than given verbatim by this
 * prompt, flagged there for Prompt 3 to confirm against the real quiz JSX.
 */

import type { Product } from "../../../api/_lib/schema";

// ---------------------------------------------------------------------------
// Answer types
// ---------------------------------------------------------------------------

// "normal", not "medium" — matches the catalog's own "Best for porosity"
// tag values (low/normal/high) exactly, so this dimension needs no
// translation table, unlike curl type and density below. Confirmed
// against the live catalog fixture 2026-08-07.
export type PorosityAnswer = "low" | "normal" | "high" | "unsure";

/**
 * Curl type is intentionally typed as `string`, not a strict union — the
 * exact full option set isn't confirmed until Prompt 3 ports the real quiz
 * JSX. Only the three compound values named in this prompt's brief
 * ("2a2b", "2c3a", "3b3c") are given special expansion treatment (see
 * CURL_TYPE_COMPOUNDS); anything else (e.g. "4a", "4b", "4c", or any other
 * single tag) is treated as a single-tag identity match. This is
 * deliberately robust to Prompt 3 introducing option values not
 * enumerated here.
 */
export type CurlTypeAnswer = string;

export const GOAL_VALUES = [
  "moisture",
  "growth",
  "definition",
  "frizz",
  "scalp",
  "damage",
  "volume",
  "simplify",
  "affordable",
  "technique",
] as const;
export type GoalAnswer = (typeof GOAL_VALUES)[number];

export const FRUSTRATION_VALUES = [
  "breakage",
  "dryness",
  "frizz",
  "products",
  "time",
  "detangling",
  "cost",
  "technique",
  "nothing",
] as const;
export type FrustrationAnswer = (typeof FRUSTRATION_VALUES)[number];

export const SENSITIVITY_VALUES = ["protein", "sulfates", "silicones", "fragrance", "mineral_oil", "none"] as const;
export type SensitivityAnswer = (typeof SENSITIVITY_VALUES)[number];

export type DensityAnswer = "fine_low" | "fine_high" | "medium" | "thick_low" | "thick_high";

/**
 * Confirmed against the real quiz JSX by Prompt 3 (nya-quiz-reference.jsx's
 * black_owned_pref options are literally "yes" / "mixed" / "no_pref") —
 * Prompt 2's guess of "yes_always"/"no_preference" is corrected here to
 * match exactly, so the quiz's answer values pass through with no
 * translation step, same as curlType/density/goals/frustrations/
 * sensitivities. See DECISIONS.md.
 */
export type BlackOwnedPref = "yes" | "mixed" | "no_pref";

export interface DiagnosticAnswers {
  porosity: PorosityAnswer;
  curlType: CurlTypeAnswer;
  /** Reported sensitivities — hard-excluded in Stage 1. "none" means no filtering. */
  sensitivities: SensitivityAnswer[];
  /** Up to 3, equal weight per match. */
  goals: GoalAnswer[];
  /** Up to 3, RANKED — index 0 is the user's #1 priority. "nothing" is skipped. */
  frustrations: FrustrationAnswer[];
  density: DensityAnswer;
  /**
   * Plain numeric ceiling in dollars, not a bucketed string enum — this
   * prompt gave no exact bucket literals ("under $10" appears only in the
   * test-profile prose, not as a code value), and a number needs no
   * translation table on either side. `null` means no budget preference
   * (dimension skipped entirely, same as porosity's "unsure"). See
   * DECISIONS.md.
   */
  budgetMax: number | null;
  blackOwnedPref: BlackOwnedPref;
  /** Never used in scoring — see SCORING_WEIGHTS' comment and DECISIONS.md. Passed through for Prompt 4's copy. */
  journey: string;
}

// ---------------------------------------------------------------------------
// Output types
// ---------------------------------------------------------------------------

export interface RecommendedProduct {
  product: Product;
  score: number;
  /** Human-readable dimensions that contributed to this score — Prompt 4's "why we picked this," and doubles as debugging output. */
  matchReasons: string[];
}

export interface CategoryRecommendation {
  category: string;
  picks: RecommendedProduct[];
  /** True if any of density/curlType/porosity had to be dropped as a requirement to fill this category. */
  relaxed: boolean;
  /** Which constraints were dropped, in the order they were dropped (never includes sensitivities). */
  relaxedConstraints: Array<"density" | "curlType" | "porosity">;
}

export interface ScoredRecommendationSet {
  categories: CategoryRecommendation[];
  /**
   * Sensitivities the user reported that could NOT be enforced because no
   * catalog column exists for them yet (currently always `["mineral_oil"]`
   * or `[]` — see MINERAL_OIL_FIELD below). Prompt 4 must not claim these
   * were filtered.
   */
  unenforcedSensitivities: SensitivityAnswer[];
  /** Passed through unused — see DiagnosticAnswers.journey. */
  journey: string;
}

const CATEGORIES = ["Shampoo", "Conditioner", "Leave-in", "Cream", "Mousse", "Oil/Sealant"] as const;

// ---------------------------------------------------------------------------
// Weights — the priority ranking. Expected to be tuned; this is the only
// place that should need to change to retune scoring priorities. Ordered
// highest to lowest per the brief:
//   1. porosity  2. curlType  3. goals  4. frustrations  5. density
//   6. budget    7. blackOwned   8. tiebreakers (ewg, community sentiment)
// Each tier's MAXIMUM attainable contribution is kept comfortably below
// the tier above it, so a lower-priority dimension can never outrank a
// higher-priority one on its own — see the inline max-contribution notes.
// ---------------------------------------------------------------------------

export const SCORING_WEIGHTS = {
  /** Porosity — heaviest. Determines whether a product physically works on someone's hair. Max contribution: 100. */
  porosity: 100,

  /** Curl type — close second. Any overlap between expanded answer tags and the product's hairTypes counts as a match. Max contribution: 80. */
  curlType: 80,

  /** Goals — equal weight per matched goal, up to 3 selected. Max contribution: 3 * 20 = 60. */
  goalMatch: 20,

  /**
   * Frustrations — rank-weighted per the quiz's own copy ("your #1 is
   * Nari's #1 priority"): rank 1 gets 3x this unit, rank 2 gets 2x, rank 3
   * gets 1x. Max contribution: (3+2+1) * 8 = 48.
   */
  frustrationUnit: 8,

  /** Density — medium weight. Quiz's fine_low/fine_high/thick_low/thick_high collapse to fine/thick before comparing. Max contribution: 15. */
  density: 15,

  /** Budget — soft, never a hard filter. In-range boosts, out-of-range penalizes but stays eligible. */
  budgetInRange: 10,
  budgetOutOfRange: -10,
  /** Null-priced products (~10 currently) rank slightly below priced in-budget matches, but are never excluded — Prompt 4 omits the price rather than showing "null". */
  nullPricePenalty: -3,

  /** Black-owned preference — light boost, never a hard filter. Kept below budget's max (10). */
  blackOwnedYesAlways: 8,
  blackOwnedMixed: 4,
  blackOwnedNoPreference: 0,

  /**
   * Tiebreakers ONLY — deliberately tiny, so these can never outweigh any
   * real dimension above, including black-owned's smallest nonzero value
   * (4). EWG score: lower is safer, so a lower score earns more.
   * Community sentiment: "Loved" > "Mixed" > (absent, no bonus).
   */
  ewgTiebreakPerPoint: 0.3,
  communitySentimentLoved: 1,
  communitySentimentMixed: 0,
} as const;

// `journey` is deliberately absent from SCORING_WEIGHTS: no product
// attribute corresponds to it, and per Nya's own note it changes how Nari
// *talks* to the user, not what she recommends. It's collected and passed
// through on ScoredRecommendationSet for Prompt 4's copy, and nowhere else
// in this file. Documented here so a future reader doesn't assume it was
// forgotten. See DECISIONS.md.

// ---------------------------------------------------------------------------
// Stage 1 — Hard filters (exclusions, not points)
// ---------------------------------------------------------------------------

const SENSITIVITY_FIELD: Partial<Record<SensitivityAnswer, "proteinFree" | "sulfateFree" | "siliconeFree" | "fragranceFree">> = {
  protein: "proteinFree",
  sulfates: "sulfateFree",
  silicones: "siliconeFree",
  fragrance: "fragranceFree",
};

/**
 * mineral_oil has no Airtable column yet (verified live 2026-08-07 — see
 * api/_lib/fieldMap.ts). Reads the actual product data at runtime rather
 * than assuming `false`, so this activates automatically the moment Nya's
 * column is added and mapped — no scoring.ts change needed. Until then,
 * every product's parsed object simply lacks this key (ProductSchema
 * doesn't declare it), so this always returns `undefined` and the filter
 * stays inert.
 */
function getMineralOilFree(product: Product): boolean | undefined {
  const raw = product as unknown as Record<string, unknown>;
  return typeof raw.mineralOilFree === "boolean" ? raw.mineralOilFree : undefined;
}

interface HardFilterResult {
  survivors: Product[];
  unenforcedSensitivities: SensitivityAnswer[];
}

/**
 * Conservative rule: only a POSITIVELY marked free-from field counts as
 * safe. An unchecked box sometimes means "contains it," sometimes means
 * "unverified" (see the Supercurl product's notes in the live catalog —
 * its sulfate/silicone/protein status is explicitly flagged as inferred
 * from marketing, not independently verified, and its checkboxes are
 * correctly left unchecked as a result). Omitting a product is a smaller
 * harm than causing a reaction, so both cases are excluded identically —
 * this happens for free via ProductSchema's existing `false`-when-absent
 * default, not anything special in this function.
 */
function applyHardFilters(catalog: Product[], sensitivities: SensitivityAnswer[]): HardFilterResult {
  const requested = sensitivities.filter((s): s is Exclude<SensitivityAnswer, "none"> => s !== "none");
  const unenforcedSensitivities: SensitivityAnswer[] = [];
  let survivors = catalog;

  for (const sensitivity of requested) {
    if (sensitivity === "mineral_oil") {
      const anyProductCarriesField = catalog.some((p) => getMineralOilFree(p) !== undefined);
      if (!anyProductCarriesField) {
        unenforcedSensitivities.push("mineral_oil");
        continue;
      }
      survivors = survivors.filter((p) => getMineralOilFree(p) === true);
      continue;
    }

    const field = SENSITIVITY_FIELD[sensitivity];
    if (!field) continue;
    survivors = survivors.filter((p) => p[field] === true);
  }

  return { survivors, unenforcedSensitivities };
}

// ---------------------------------------------------------------------------
// Shared answer -> catalog-tag translation
// ---------------------------------------------------------------------------

/** Only the three compounds this prompt names — everything else passes through as a single tag. */
const CURL_TYPE_COMPOUNDS: Record<string, string[]> = {
  "2a2b": ["2a", "2b"],
  "2c3a": ["2c", "3a"],
  "3b3c": ["3b", "3c"],
};

function expandCurlType(answer: CurlTypeAnswer): string[] {
  const normalized = answer.trim().toLowerCase();
  return CURL_TYPE_COMPOUNDS[normalized] ?? [normalized];
}

const DENSITY_COLLAPSE: Record<DensityAnswer, string> = {
  fine_low: "fine",
  fine_high: "fine",
  medium: "medium",
  thick_low: "thick",
  thick_high: "thick",
};

// ---------------------------------------------------------------------------
// Stage 2 — Weighted scoring
// ---------------------------------------------------------------------------

function blackOwnedScore(pref: BlackOwnedPref, product: Product): number {
  if (!product.blackOwned) return 0;
  if (pref === "yes") return SCORING_WEIGHTS.blackOwnedYesAlways;
  if (pref === "mixed") return SCORING_WEIGHTS.blackOwnedMixed;
  return SCORING_WEIGHTS.blackOwnedNoPreference;
}

function scoreProduct(product: Product, answers: DiagnosticAnswers): RecommendedProduct {
  let score = 0;
  const matchReasons: string[] = [];

  // Porosity — "unsure" skips the dimension entirely (never penalize, never guess).
  if (answers.porosity !== "unsure" && product.porosity.includes(answers.porosity)) {
    score += SCORING_WEIGHTS.porosity;
    matchReasons.push(`porosity: ${answers.porosity}`);
  }

  // Curl type — any overlap between expanded tags and the product's hairTypes.
  const curlOverlap = expandCurlType(answers.curlType).filter((tag) => product.hairTypes.includes(tag));
  if (curlOverlap.length > 0) {
    score += SCORING_WEIGHTS.curlType;
    matchReasons.push(`curl type: ${curlOverlap.join(", ")}`);
  }

  // Goals — equal weight per match, up to 3.
  for (const goal of answers.goals) {
    if (product.goals.includes(goal)) {
      score += SCORING_WEIGHTS.goalMatch;
      matchReasons.push(`goal: ${goal}`);
    }
  }

  // Frustrations — rank-weighted, "nothing" skipped.
  answers.frustrations.forEach((frustration, index) => {
    if (frustration === "nothing") return;
    if (!product.frustrations.includes(frustration)) return;
    const rankMultiplier = 3 - Math.min(index, 2); // rank 0 -> 3x, rank 1 -> 2x, rank 2+ -> 1x
    score += SCORING_WEIGHTS.frustrationUnit * rankMultiplier;
    matchReasons.push(`frustration #${index + 1}: ${frustration}`);
  });

  // Density — quiz's fine/thick low/high collapse before comparing.
  const densityTag = DENSITY_COLLAPSE[answers.density];
  if (product.density.includes(densityTag)) {
    score += SCORING_WEIGHTS.density;
    matchReasons.push(`density: ${densityTag}`);
  }

  // Budget — soft, never excludes. Null-priced products get a small
  // penalty instead of being treated as free or excluded.
  if (answers.budgetMax !== null) {
    if (product.price === null) {
      score += SCORING_WEIGHTS.nullPricePenalty;
    } else if (product.price <= answers.budgetMax) {
      score += SCORING_WEIGHTS.budgetInRange;
      matchReasons.push(`within budget ($${product.price} ≤ $${answers.budgetMax})`);
    } else {
      score += SCORING_WEIGHTS.budgetOutOfRange;
    }
  }

  // Black-owned preference — soft, never excludes.
  const boScore = blackOwnedScore(answers.blackOwnedPref, product);
  if (boScore > 0) {
    score += boScore;
    matchReasons.push("black-owned brand");
  }

  // Tiebreakers only.
  if (product.ewgScore !== null) {
    score += (10 - product.ewgScore) * SCORING_WEIGHTS.ewgTiebreakPerPoint;
  }
  if (product.communitySentiment === "Loved") {
    score += SCORING_WEIGHTS.communitySentimentLoved;
  } else if (product.communitySentiment === "Mixed") {
    score += SCORING_WEIGHTS.communitySentimentMixed;
  }

  return { product, score, matchReasons };
}

// ---------------------------------------------------------------------------
// Stage 3 — Select and diversify
// ---------------------------------------------------------------------------

const MAX_PICKS_PER_CATEGORY = 3;
const MIN_PICKS_BEFORE_RELAXATION = 2;

/** No more than one product per brand within a category, unless there's no alternative to reach MAX_PICKS_PER_CATEGORY. */
function selectForCategory(candidates: RecommendedProduct[]): RecommendedProduct[] {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const picks: RecommendedProduct[] = [];
  const usedBrands = new Set<string>();

  for (const candidate of sorted) {
    if (picks.length >= MAX_PICKS_PER_CATEGORY) break;
    if (usedBrands.has(candidate.product.brand)) continue;
    picks.push(candidate);
    usedBrands.add(candidate.product.brand);
  }

  // Only fill with repeat brands if diversity alone couldn't reach the cap.
  if (picks.length < Math.min(MAX_PICKS_PER_CATEGORY, sorted.length)) {
    for (const candidate of sorted) {
      if (picks.length >= MAX_PICKS_PER_CATEGORY) break;
      if (picks.includes(candidate)) continue;
      picks.push(candidate);
    }
  }

  return picks;
}

// ---------------------------------------------------------------------------
// Stage 4 — Relaxation fallback
// ---------------------------------------------------------------------------

type RelaxableDimension = "density" | "curlType" | "porosity";
/** Weakest constraint dropped first. Sensitivities are never in this list — Stage 1 already ran and is never revisited. */
const RELAXATION_ORDER: RelaxableDimension[] = ["density", "curlType", "porosity"];

function requiredDimensionsFor(answers: DiagnosticAnswers): Set<RelaxableDimension> {
  const required = new Set<RelaxableDimension>(["density", "curlType"]);
  // "unsure" already means porosity was never a requirement to begin with,
  // not merely "already relaxed" — consistent with Stage 2 never scoring it.
  if (answers.porosity !== "unsure") required.add("porosity");
  return required;
}

function meetsRequiredDimensions(product: Product, answers: DiagnosticAnswers, required: Set<RelaxableDimension>): boolean {
  if (required.has("porosity") && !product.porosity.includes(answers.porosity)) return false;
  if (required.has("curlType")) {
    const tags = expandCurlType(answers.curlType);
    if (!tags.some((tag) => product.hairTypes.includes(tag))) return false;
  }
  if (required.has("density") && !product.density.includes(DENSITY_COLLAPSE[answers.density])) return false;
  return true;
}

/**
 * This is load-bearing right now, not a safety net: the catalog has no
 * products tagged 2a/2b/2c while the quiz offers those answers, so 2A/2B
 * and 2C/3A users hit relaxation on day one (see DECISIONS.md).
 */
function buildCategoryRecommendation(category: string, hardFilteredCatalog: Product[], answers: DiagnosticAnswers): CategoryRecommendation {
  const scoredAll = hardFilteredCatalog.filter((p) => p.category === category).map((p) => scoreProduct(p, answers));

  const required = requiredDimensionsFor(answers);
  const relaxedConstraints: RelaxableDimension[] = [];
  let eligible = scoredAll.filter((c) => meetsRequiredDimensions(c.product, answers, required));

  for (const dimension of RELAXATION_ORDER) {
    if (eligible.length >= MIN_PICKS_BEFORE_RELAXATION) break;
    if (!required.has(dimension)) continue; // e.g. porosity "unsure" was never required
    required.delete(dimension);
    relaxedConstraints.push(dimension);
    eligible = scoredAll.filter((c) => meetsRequiredDimensions(c.product, answers, required));
  }

  return {
    category,
    picks: selectForCategory(eligible),
    relaxed: relaxedConstraints.length > 0,
    relaxedConstraints,
  };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/**
 * Pure: no network, no React, no side effects. Same (answers, catalog)
 * always produces the same ScoredRecommendationSet.
 */
export function scoreProducts(answers: DiagnosticAnswers, catalog: Product[]): ScoredRecommendationSet {
  const { survivors, unenforcedSensitivities } = applyHardFilters(catalog, answers.sensitivities);

  const categories = CATEGORIES.map((category) => buildCategoryRecommendation(category, survivors, answers));

  return { categories, unenforcedSensitivities, journey: answers.journey };
}
