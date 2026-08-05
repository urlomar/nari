import { z } from "zod";
import { FIELD_MAP, type AirtableFieldName, type ProductFieldName } from "./fieldMap";

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
  brand: z.string().min(1),
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
  blackOwned: z.boolean().default(false),
  ewgScore: z.number().nullable().default(null),
  communitySentiment: z.string().optional(),
  notes: z.string().optional(),
  buyLink: z.string().optional(),
  // No image URL column exists in the live base yet (Prompt 4 handles
  // absence gracefully) — left optional so nothing here forces it.
  imageUrl: z.string().optional(),
});
export type Product = z.infer<typeof ProductSchema>;

type FieldKind = "string" | "optionalString" | "boolean" | "number" | "stringArrayLower";

const FIELD_KINDS: Record<ProductFieldName, FieldKind> = {
  name: "string",
  brand: "string",
  category: "string",
  ounces: "number",
  price: "number",
  hairTypes: "stringArrayLower",
  porosity: "stringArrayLower",
  density: "stringArrayLower",
  sulfateFree: "boolean",
  siliconeFree: "boolean",
  proteinFree: "boolean",
  blackOwned: "boolean",
  ewgScore: "number",
  communitySentiment: "optionalString",
  notes: "optionalString",
  buyLink: "optionalString",
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

export interface NormalizationReport {
  totalFetched: number;
  validCount: number;
  skippedCount: number;
  skippedRows: SkippedRow[];
  /** Airtable fields present in the response but absent from FIELD_MAP — Nya added a column that isn't wired up yet. */
  unmappedFields: string[];
  /** FIELD_MAP entries never seen in any fetched record — Nya renamed or removed a column FIELD_MAP still expects. */
  missingMappedFields: string[];
}

export function buildNormalizationReport(
  records: AirtableRecord[],
  results: NormalizeResult[]
): NormalizationReport {
  const skippedRows = results
    .filter((r): r is Extract<NormalizeResult, { success: false }> => !r.success)
    .map((r) => r.skipped);
  const validCount = results.length - skippedRows.length;

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
  };
}
