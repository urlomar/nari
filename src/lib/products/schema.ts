import { z } from "zod";
// Type-only: erased at compile time, so this adds zero runtime dependency
// on api/_lib — the actual Product validation logic runs server-side only
// (see api/_lib/schema.ts's doc comment for why that boundary matters).
import type { Product } from "../../../api/_lib/schema";

export type { Product };

// --- /api/products response shape, validated client-side in dataSource.ts ---
//
// This is a separate, lightweight definition rather than importing the
// server's ProductSchema at runtime — the server already validated every
// product deeply before sending it, so this only needs to catch gross
// shape mismatches (a network/proxy returning the wrong body, an API
// contract drift), not re-run full per-field validation.

export const ProductsMetaSchema = z.object({
  stale: z.boolean(),
  fetchedAt: z.string(),
  totalFetched: z.number(),
  validCount: z.number(),
  skippedCount: z.number(),
  skippedRows: z.array(z.object({ id: z.string(), reasons: z.array(z.string()) })),
  unmappedFields: z.array(z.string()),
  missingMappedFields: z.array(z.string()),
});
export type ProductsMeta = z.infer<typeof ProductsMetaSchema>;

const ProductShapeSchema = z.custom<Product>(
  (val) => typeof val === "object" && val !== null && "id" in val && "name" in val && "category" in val
);

export const ProductsResponseSchema = z.object({
  products: z.array(ProductShapeSchema),
  meta: ProductsMetaSchema,
});
export type ProductsResponse = z.infer<typeof ProductsResponseSchema>;
