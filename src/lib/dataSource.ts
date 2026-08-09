import type { RecommendationSet } from "./schemas";
import type { DiagnosticAnswers } from "./products/scoring";
import { ProductsResponseSchema, type ProductsResponse } from "./products/schema";
import recommendationsData from "./mock/recommendations.json";

const RECOMMENDATIONS_DELAY_MS = 1800;

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Single boundary between UI and product recommendation content. Backed by
 * local mock JSON today; swapping the backing source later (the real
 * scoreProducts() from src/lib/products/scoring.ts, per Prompt 4) only
 * means changing what happens inside this function — no caller changes.
 *
 * Takes the real quiz's DiagnosticAnswers shape (Prompt 3's
 * toDiagnosticAnswers() produces one) even though this mock body still
 * ignores it — that's Prompt 4's wiring, not this one's — but the
 * parameter type is honest about what the caller now actually has, rather
 * than the old QuizAnswers/HairContext shape from the placeholder quiz.
 */
export function getRecommendations(_answers: DiagnosticAnswers): Promise<RecommendationSet> {
  return delay(recommendationsData as RecommendationSet, RECOMMENDATIONS_DELAY_MS);
}

/**
 * Real catalog data, backed by /api/products (Airtable, cached server-side).
 * Not yet consumed by getRecommendations() — that stays on mock data until
 * Prompt 4 wires in the scoring function from Prompt 2.
 */
export async function getProducts(): Promise<ProductsResponse> {
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
