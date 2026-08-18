import type { DiagnosticAnswers, ScoredRecommendationSet } from "./products/scoring";
import { scoreProducts } from "./products/scoring";
import { ProductsResponseSchema, type ProductsResponse } from "./products/schema";

/**
 * Single boundary between UI and the product catalog / recommendation
 * engine. `getProducts()` fetches and validates the live Airtable-backed
 * catalog (via /api/products); `getRecommendations()` runs the pure
 * `scoreProducts()` function (src/lib/products/scoring.ts) against it.
 *
 * The catalog fetch is cached in a module-level promise so repeated calls
 * (prefetch at quiz start, then the real call at the analyzing step, plus
 * any other consumer like ProductsDebug) share one in-flight/resolved
 * request instead of re-fetching. A failed fetch clears the cache so the
 * next call retries fresh rather than replaying the same rejection forever.
 */
let productsPromise: Promise<ProductsResponse> | null = null;

async function fetchProducts(): Promise<ProductsResponse> {
  const res = await fetch("/api/products");
  if (!res.ok) {
    throw new Error(`Failed to load products (status ${res.status}).`);
  }

  const data = await res.json();
  const parsed = ProductsResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("Products response failed schema validation.");
  }

  return parsed.data;
}

export function getProducts(): Promise<ProductsResponse> {
  if (!productsPromise) {
    productsPromise = fetchProducts().catch((err) => {
      // Let the next call retry fresh instead of replaying this rejection.
      productsPromise = null;
      throw err;
    });
  }
  return productsPromise;
}

/**
 * Kicks off the catalog fetch without waiting on it — call this the moment
 * the quiz starts (ScannerRoute, on entering the "quiz" step), not at the
 * results page. Scoring itself is milliseconds; the network fetch is the
 * slow part, especially against a cold server cache. The user spends
 * minutes on 9 questions, so the catalog is warm well before
 * getRecommendations() needs it. Deliberately does NOT precompute
 * scoring — the user can still go back and change answers, and
 * invalidating a cached score isn't worth the complexity for a
 * millisecond-cheap pure function. Safe to call more than once (e.g. if
 * the user backs into the quiz again) — getProducts()'s own cache dedupes.
 */
export function prefetchProducts(): void {
  void getProducts();
}

/** Real recommendations: fetches the live catalog, then runs the pure scoreProducts() engine against it. */
export async function getRecommendations(answers: DiagnosticAnswers): Promise<ScoredRecommendationSet> {
  const { products } = await getProducts();
  return scoreProducts(answers, products);
}
