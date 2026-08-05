import type { HairContext, QuizAnswers, QuizQuestion, RecommendationSet } from "./schemas";
import { ProductsResponseSchema, type ProductsResponse } from "./products/schema";
import quizQuestionsData from "./mock/quizQuestions.json";
import recommendationsData from "./mock/recommendations.json";

const QUIZ_QUESTIONS_DELAY_MS = 400;
const RECOMMENDATIONS_DELAY_MS = 1800;

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

/**
 * Single boundary between UI and quiz/product content. Backed by local mock
 * JSON today; swapping the backing source later (Airtable via a serverless
 * function, or anything else) only means changing what happens inside these
 * two functions — no caller changes.
 */
export function getQuizQuestions(): Promise<QuizQuestion[]> {
  return delay(quizQuestionsData as QuizQuestion[], QUIZ_QUESTIONS_DELAY_MS);
}

export function getRecommendations(
  _answers: QuizAnswers,
  _hairContext: HairContext
): Promise<RecommendationSet> {
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
