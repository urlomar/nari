import { z } from "zod";
import { FIELD_MAP, type AirtableFieldName, type ProductFieldName } from "./fieldMap.js";

/**
 * Server-only: normalization/validation for the Airtable product catalog.
 * Lives under api/_lib (not src/lib) so api/products.ts stays
 * self-contained within the api/ directory tree, matching api/subscribe.ts
 * — see CLAUDE.md "Product Data Pipeline" for why (a production
 * FUNCTION_INVOCATION_FAILED caused by a cross-directory import that
 * Vercel's Node function builder didn't trace).
 *
 * The client-side Product *type* is available via a type-only import from
 * src/lib/products/schema.ts (erased at compile time, so it adds no
 * runtime dependency in either direction) — the actual Zod validation
 * here never runs in the browser bundle.
 */

/** One record as returned by the Airtable REST API — never exposed past this file. */
export interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

export const ProductSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  // Optional: the catalog's 5 "Style" rows (Braids, Blow Out, Wash and Go,
  // etc.) legitimately have no brand — a style is a technique, not a
  // purchased product. Verified live 2026-08-29: all 5 brand-less rows are
  // category "Style", nothing else. These rows still aren't recommended
  // anywhere today — scoring.ts's CATEGORIES only iterates the 6 real
  // product categories — but they belong in the catalog/normalization
  // report rather than being silently dropped as "invalid."
  brand: z.string().optional(),
  category: z.string().min(1),
  ounces: z.number().nullable().default(null),
  price: z.number().nullable().default(null),
  // Lowercased/trimmed per Prompt 1's normalization policy — Airtable
  // stores these capitalized ("4C", "High", "Medium") and a non-developer
  // maintains the data, so casing can drift between rows. Translating
  // these into the quiz's compound/finer-grained answer values is
  // deliberately NOT done here — that's Prompt 2's scoring layer.
  hairTypes: z.array(z.string()).default([]),
  porosity: z.array(z.string()).default([]),
  density: z.array(z.string()).default([]),
  sulfateFree: z.boolean().default(false),
  siliconeFree: z.boolean().default(false),
  proteinFree: z.boolean().default(false),
  fragranceFree: z.boolean().default(false),
  blackOwned: z.boolean().default(false),
  // Wired 2026-08-29 — see fieldMap.ts. scoring.ts's mineral-oil filter
  // reads this directly and was written to activate automatically the
  // moment it's a real boolean instead of always-undefined.
  mineralOilFree: z.boolean().default(false),
  ewgScore: z.number().nullable().default(null),
  communitySentiment: z.string().optional(),
  notes: z.string().optional(),
  buyLink: z.string().optional(),
  // "Best For Goals" / "Frustrations" — lowercased/trimmed like the other
  // multi-selects, PLUS a small alias table (see GOAL_ALIASES below) for
  // the two goal values that don't match the quiz's vocabulary exactly.
  // The alias table lives here, at the normalization boundary, precisely
  // so scoring.ts never has to know Airtable's raw wording — see
  // scoring.ts's header comment and DECISIONS.md.
  goals: z.array(z.string()).default([]),
  frustrations: z.array(z.string()).default([]),
  // Free text, display-only — plays no role in scoring (Prompt 2).
  keyIngredients: z.string().optional(),
  // No image URL column exists in the live base yet (Prompt 4 handles
  // absence gracefully) — left optional so nothing here forces it.
  imageUrl: z.string().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

type FieldKind =
  | "string"
  | "optionalString"
  | "boolean"
  | "number"
  | "stringArrayLower"
  | "goalsArray"
  | "frustrationsArray";

const FIELD_KINDS: Record<ProductFieldName, FieldKind> = {
  name: "string",
  brand: "optionalString",
  category: "string",
  ounces: "number",
  price: "number",
  hairTypes: "stringArrayLower",
  porosity: "stringArrayLower",
  density: "stringArrayLower",
  sulfateFree: "boolean",
  siliconeFree: "boolean",
  proteinFree: "boolean",
  fragranceFree: "boolean",
  blackOwned: "boolean",
  mineralOilFree: "boolean",
  ewgScore: "number",
  communitySentiment: "optionalString",
  notes: "optionalString",
  buyLink: "optionalString",
  goals: "goalsArray",
  frustrations: "frustrationsArray",
  keyIngredients: "optionalString",
};

// "Best For Goals" values that don't match the quiz's answer vocabulary
// exactly (verified against the live base 2026-08-07) — normalized here,
// at the data boundary, so scoring.ts can compare goals/frustrations
// against product tags with plain equality and never needs to know
// Airtable's original wording. See DECISIONS.md for the full mismatch
// list, including the quiz goals ("volume", "simplify", "technique") that
// have no catalog equivalent at all (not an error — they just never
// match anything).
const GOAL_ALIASES: Record<string, string> = {
  "scalp health": "scalp",
  "heat or color damage": "damage",
  // Airtable's "Length retention" (currently only on the "Twist/Natural
  // Cornrow & Protective" Style row) is the same concept the quiz calls
  // "growth" — added Final Spike Part D after valueDrift.goals flagged it
  // as an unresolved mismatch. See CLAUDE.md/DECISIONS.md.
  "length retention": "growth",
  // TEMPORARY WORKAROUND (results-page P3, Part A): all 5 live Style rows'
  // "Best For Goals" carry the misspelling "tehnique" instead of
  // "technique" — the quiz only ever emits "technique". The CEO is
  // correcting it in Airtable, but the fix's timing is unknown, so both
  // spellings are mapped here rather than waiting on her edit. Remove the
  // "tehnique" line (keep "technique" -> "technique" or drop it entirely,
  // since a value already equal to its own key is a no-op) once the
  // Airtable correction is confirmed live. See DECISIONS.md open questions.
  "tehnique": "technique",
  "technique": "technique",
};

// Same pattern as GOAL_ALIASES, one dimension over. Verified live
// 2026-08-29: the catalog's "Frustrations" column uses "Breakage/length
// retention" where the quiz's frustration question only ever emits
// "breakage" — with no alias, every one of the 10 products tagged this way
// silently failed to match ANY user who picked breakage as their #1
// frustration, on a dimension weighted 3x for the top pick. See
// DECISIONS.md.
const FRUSTRATION_ALIASES: Record<string, string> = {
  "breakage/length retention": "breakage",
};

function coerce(kind: FieldKind, value: unknown): unknown {
  switch (kind) {
    case "string":
      return typeof value === "string" ? value.trim() : value;
    case "optionalString":
      return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
    case "boolean":
      // Airtable omits unchecked checkbox fields from the response entirely
      // rather than sending `false` — absence must default to false, not
      // be treated as missing/invalid.
      return value === true;
    case "number":
      // A missing price/ounces/EWG score is not the same as zero.
      return typeof value === "number" ? value : null;
    case "stringArrayLower":
      return Array.isArray(value)
        ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim().toLowerCase())
        : [];
    case "goalsArray":
      return Array.isArray(value)
        ? value
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim().toLowerCase())
            .map((v) => GOAL_ALIASES[v] ?? v)
        : [];
    case "frustrationsArray":
      return Array.isArray(value)
        ? value
            .filter((v): v is string => typeof v === "string")
            .map((v) => v.trim().toLowerCase())
            .map((v) => FRUSTRATION_ALIASES[v] ?? v)
        : [];
  }
}

export interface SkippedRow {
  id: string;
  reasons: string[];
}

export type NormalizeResult =
  | { success: true; product: Product }
  | { success: false; skipped: SkippedRow };

/** Parses one raw Airtable record via FIELD_MAP. Never throws — invalid rows are skipped, not fatal. */
export function normalizeProduct(record: AirtableRecord): NormalizeResult {
  const raw: Record<string, unknown> = { id: record.id };
  for (const [airtableField, propName] of Object.entries(FIELD_MAP) as [AirtableFieldName, ProductFieldName][]) {
    raw[propName] = coerce(FIELD_KINDS[propName], record.fields[airtableField]);
  }

  const parsed = ProductSchema.safeParse(raw);
  if (!parsed.success) {
    const reasons = parsed.error.issues.map((issue) => `${issue.path.join(".") || "product"}: ${issue.message}`);
    return { success: false, skipped: { id: record.id, reasons } };
  }
  return { success: true, product: parsed.data };
}

/**
 * Expected catalog-side vocabulary for the 5 dimensions scoring.ts compares
 * against real quiz answer values. Duplicated here rather than imported —
 * same reasoning as api/_lib/schemas.ts's hand-duplication of a subset of
 * src/lib/schemas.ts (see CLAUDE.md "Server code boundary"): api/_lib can't
 * import from src/lib without risking the exact FUNCTION_INVOCATION_FAILED
 * this file's own header comment describes. Keep these in sync by hand if
 * scoring.ts's GOAL_VALUES/FRUSTRATION_VALUES/DENSITY_COLLAPSE or the
 * porosity/hairType vocab ever change.
 *
 * Column-name drift (Nya adding/renaming a column) was already caught by
 * unmappedFields/missingMappedFields above. Column *value* drift — a real
 * row using a value that doesn't match what scoring.ts expects — was not
 * caught by anything, which is exactly how the "breakage/length retention"
 * vs. "breakage" mismatch (see FRUSTRATION_ALIASES) went unnoticed. This
 * audit runs post-normalization (after lowercasing/trimming/alias tables),
 * so a value only shows up here if it's a REAL, unresolved mismatch, not
 * just a casing difference the pipeline already handles.
 */
const EXPECTED_GOALS = new Set([
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
]);
const EXPECTED_FRUSTRATIONS = new Set([
  "breakage",
  "dryness",
  "frizz",
  "products",
  "time",
  "detangling",
  "cost",
  "technique",
  "nothing",
]);
// Catalog-side only — "unsure" is a quiz-only answer with no catalog tag.
const EXPECTED_POROSITY = new Set(["low", "normal", "high"]);
// Catalog-side (collapsed) values — scoring.ts's DENSITY_COLLAPSE maps the
// quiz's 5 finer-grained answers down to these same 3 before comparing.
const EXPECTED_DENSITY = new Set(["fine", "medium", "thick"]);
// Every single curl-type tag the app models (1A-4C), not just the 6 that
// happen to exist in the catalog today — new hairTypes rows in the
// currently-absent 1A-2C range should validate cleanly, not get flagged.
const EXPECTED_HAIR_TYPES = new Set([
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
]);

export interface ValueDriftReport {
  goals: string[];
  frustrations: string[];
  porosity: string[];
  density: string[];
  hairTypes: string[];
}

function driftFor(values: Iterable<string>, expected: Set<string>): string[] {
  const seen = new Set<string>();
  for (const v of values) if (!expected.has(v)) seen.add(v);
  return [...seen].sort();
}

/** Post-normalization value drift — see the vocab comment above. */
function computeValueDrift(products: Product[]): ValueDriftReport {
  return {
    goals: driftFor(products.flatMap((p) => p.goals), EXPECTED_GOALS),
    frustrations: driftFor(products.flatMap((p) => p.frustrations), EXPECTED_FRUSTRATIONS),
    porosity: driftFor(products.flatMap((p) => p.porosity), EXPECTED_POROSITY),
    density: driftFor(products.flatMap((p) => p.density), EXPECTED_DENSITY),
    hairTypes: driftFor(products.flatMap((p) => p.hairTypes), EXPECTED_HAIR_TYPES),
  };
}

export interface NormalizationReport {
  totalFetched: number;
  validCount: number;
  skippedCount: number;
  skippedRows: SkippedRow[];
  /** Airtable fields present in the response but absent from FIELD_MAP — Nya added a column that isn't wired up yet. */
  unmappedFields: string[];
  /** FIELD_MAP entries never seen in any fetched record — Nya renamed or removed a column FIELD_MAP still expects. */
  missingMappedFields: string[];
  /** Per-dimension catalog values that don't match scoring.ts's expected vocabulary, post-normalization — see the comment above computeValueDrift. */
  valueDrift: ValueDriftReport;
}

export function buildNormalizationReport(
  records: AirtableRecord[],
  results: NormalizeResult[]
): NormalizationReport {
  const skippedRows = results
    .filter((r): r is Extract<NormalizeResult, { success: false }> => !r.success)
    .map((r) => r.skipped);
  const validCount = results.length - skippedRows.length;
  const products = results
    .filter((r): r is Extract<NormalizeResult, { success: true }> => r.success)
    .map((r) => r.product);

  const seenFields = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record.fields)) seenFields.add(key);
  }
  const mappedFields = new Set(Object.keys(FIELD_MAP));
  const unmappedFields = [...seenFields].filter((f) => !mappedFields.has(f)).sort();
  const missingMappedFields = [...mappedFields].filter((f) => !seenFields.has(f)).sort();

  return {
    totalFetched: records.length,
    validCount,
    skippedCount: skippedRows.length,
    skippedRows,
    unmappedFields,
    missingMappedFields,
    valueDrift: computeValueDrift(products),
  };
}
