import { z } from "zod";

/**
 * Server-only subset of src/lib/schemas.ts, needed by api/analyze.ts at
 * runtime. Duplicated rather than imported across the boundary — Vercel's
 * Node function builder transpiles each api/*.ts file in place without
 * bundling, and only copies files that already live under api/ into the
 * deployed Lambda (see CLAUDE.md "Server code boundary" for the incident
 * that found this). src/lib/schemas.ts remains the single source of truth
 * for client code; keep these two in sync by hand if either changes.
 */

export const NaturalStateAnswerSchema = z.enum(["natural", "straightened", "protective", "other"]);

export const ProductAnswerSchema = z.enum(["none", "light", "heavy"]);

export const FreshnessAnswerSchema = z.enum(["fresh", "few-days", "wash-day"]);

export const AnalyzePhotoSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});

export const AnalyzeRequestSchema = z.object({
  photos: z.object({
    front: AnalyzePhotoSchema,
    back: AnalyzePhotoSchema,
    strand: AnalyzePhotoSchema,
  }),
  answers: z.object({
    naturalState: NaturalStateAnswerSchema,
    product: ProductAnswerSchema,
    freshness: FreshnessAnswerSchema,
  }),
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const CurlPatternSchema = z.enum([
  "1A", "1B", "1C",
  "2A", "2B", "2C",
  "3A", "3B", "3C",
  "4A", "4B", "4C",
]);

export const PorosityEstimateSchema = z.enum(["low", "medium", "high"]);

export const RecommendationSchema = z.object({
  title: z.string(),
  why: z.string(),
});

export const HairAnalysisSchema = z.object({
  curlPattern: CurlPatternSchema,
  porosity: PorosityEstimateSchema,
  conditionNotes: z.string(),
  recommendations: z.array(RecommendationSchema).length(3),
});
export type HairAnalysis = z.infer<typeof HairAnalysisSchema>;
