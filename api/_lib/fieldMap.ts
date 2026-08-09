/**
 * Airtable column name -> internal Product property name.
 *
 * Nya (non-developer) maintains the Airtable base directly and can rename
 * or add columns at any time. This file is the single place that has to
 * change when she does — her column names must never appear in
 * scoring logic, components, or tests, only here and in the normalization
 * code that walks this map (see schema.ts).
 *
 * Verified against the live base on 2026-08-05. Several names differ from
 * the originally-described schema (no hyphens, different casing/spelling)
 * — see CLAUDE.md "Product Data Pipeline" for the full list of mismatches
 * found.
 *
 * Updated 2026-08-07 (Prompt 2) to map four columns that were previously
 * left intentionally unmapped: "Best For Goals", "Frustrations",
 * "Fragrance Free" (a checkbox like the other free-from fields), and
 * "Key ingredients" (free text, display-only — plays no role in scoring).
 * "Who it works for", seen in Prompt 1's inspection, no longer appears in
 * the live base as of this pass and was dropped from FIELD_MAP; if it
 * reappears it'll surface in the normalization report's `unmappedFields`
 * rather than being silently lost.
 *
 * No image URL column and no mineral-oil-related column exist yet in the
 * live base (verified again on this pass) — see scoring.ts for how the
 * mineral-oil sensitivity filter is written to activate automatically,
 * with no code change beyond adding a column here, once one exists.
 *
 * Server-only: lives under api/_lib (not src/lib) because api/*.ts
 * functions run as standalone Vercel Lambdas and only reliably bundle
 * files that stay within the api/ directory tree — see the "Product Data
 * Pipeline" section of CLAUDE.md for the production incident that found
 * this the hard way.
 */
export const FIELD_MAP = {
  "Product name": "name",
  "Brand": "brand",
  "Category": "category",
  "Ounces": "ounces",
  "Price": "price",
  "Best for hair type": "hairTypes",
  "Best for porosity": "porosity",
  "Best for density": "density",
  "Sulfate free": "sulfateFree",
  "Silicone free": "siliconeFree",
  "Protein free": "proteinFree",
  "Fragrance Free": "fragranceFree",
  "Blk owned": "blackOwned",
  "EWG safety score": "ewgScore",
  "Community sentiment": "communitySentiment",
  "Notes/context": "notes",
  "Buy link": "buyLink",
  "Best For Goals": "goals",
  "Frustrations": "frustrations",
  "Key ingredients": "keyIngredients",
} as const;

export type AirtableFieldName = keyof typeof FIELD_MAP;
export type ProductFieldName = (typeof FIELD_MAP)[AirtableFieldName];
