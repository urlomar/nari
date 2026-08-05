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
 * Two columns exist in the live base but are intentionally left unmapped:
 * "Key ingredients" and "Who it works for" (free-text, not covered by
 * this prompt's scope). They'll surface in the normalization report as
 * "present in response but absent from FIELD_MAP" rather than being
 * silently dropped — add them here if/when they're needed.
 *
 * No image URL column exists yet in the live base.
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
  "Blk owned": "blackOwned",
  "EWG safety score": "ewgScore",
  "Community sentiment": "communitySentiment",
  "Notes/context": "notes",
  "Buy link": "buyLink",
} as const;

export type AirtableFieldName = keyof typeof FIELD_MAP;
export type ProductFieldName = (typeof FIELD_MAP)[AirtableFieldName];
