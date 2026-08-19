import { z } from "zod";

export const NaturalStateAnswerSchema = z.enum([
  "natural",
  "straightened",
  "protective",
  "other",
]);
export type NaturalStateAnswer = z.infer<typeof NaturalStateAnswerSchema>;

export const ProductAnswerSchema = z.enum(["none", "light", "heavy"]);
export type ProductAnswer = z.infer<typeof ProductAnswerSchema>;

export const FreshnessAnswerSchema = z.enum(["fresh", "few-days", "wash-day"]);
export type FreshnessAnswer = z.infer<typeof FreshnessAnswerSchema>;

// In-progress answers, as held by the scanner reducer. Each starts null
// until the matching question is answered.
export const ScanAnswersSchema = z.object({
  naturalState: NaturalStateAnswerSchema.nullable(),
  product: ProductAnswerSchema.nullable(),
  freshness: FreshnessAnswerSchema.nullable(),
});
export type ScanAnswers = z.infer<typeof ScanAnswersSchema>;

// In-progress photos, as held by the scanner reducer.
export const ScanPhotosSchema = z.object({
  front: z.instanceof(File).nullable(),
  back: z.instanceof(File).nullable(),
  strand: z.instanceof(File).nullable(),
});
export type ScanPhotos = z.infer<typeof ScanPhotosSchema>;

// A fully completed scan, required before analysis can run.
export const ScanDataSchema = z.object({
  photos: z.object({
    front: z.instanceof(File),
    back: z.instanceof(File),
    strand: z.instanceof(File),
  }),
  answers: z.object({
    naturalState: NaturalStateAnswerSchema,
    product: ProductAnswerSchema,
    freshness: FreshnessAnswerSchema,
  }),
});
export type ScanData = z.infer<typeof ScanDataSchema>;

export const CurlPatternSchema = z.enum([
  "1A", "1B", "1C",
  "2A", "2B", "2C",
  "3A", "3B", "3C",
  "4A", "4B", "4C",
]);
export type CurlPattern = z.infer<typeof CurlPatternSchema>;

export const PorosityEstimateSchema = z.enum(["low", "medium", "high"]);
export type PorosityEstimate = z.infer<typeof PorosityEstimateSchema>;

export const RecommendationSchema = z.object({
  title: z.string(),
  why: z.string(),
});
export type Recommendation = z.infer<typeof RecommendationSchema>;

export const HairAnalysisSchema = z.object({
  curlPattern: CurlPatternSchema,
  porosity: PorosityEstimateSchema,
  conditionNotes: z.string(),
  recommendations: z.array(RecommendationSchema).length(3),
});
export type HairAnalysis = z.infer<typeof HairAnalysisSchema>;

// api/analyze.ts request body — photos travel as base64 over the wire.
export const AnalyzePhotoSchema = z.object({
  base64: z.string().min(1),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type AnalyzePhoto = z.infer<typeof AnalyzePhotoSchema>;

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

// The quiz's own input types (QuizAnswers/QuizQuestionConfig) live in
// src/features/scanner/quiz/quizTypes.ts; the scoring engine's input/output
// types (DiagnosticAnswers/ScoredRecommendationSet) live in
// src/lib/products/scoring.ts — see DECISIONS.md for why neither reuses a
// shared schema here. The old placeholder ProductPick/RecommendationCategory/
// RecommendationSet types that used to live in this section were retired
// once ScanResults.tsx and dataSource.ts moved onto the real scoring engine.

// CTA.tsx / results-page waitlist form — shared by useSubscribe.
export const SubscribeInputSchema = z.object({
  firstName: z.string().min(1, "First name is required."),
  lastName: z.string().min(1, "Last name is required."),
  email: z.string().email("Please enter a valid email address."),
  hairType: z.string().max(80, "Hair type description is too long.").optional(),
});
export type SubscribeInput = z.infer<typeof SubscribeInputSchema>;

// ScanResults.tsx's "email me my results" form — shared by useSendResults.
// Only the email needs client-side validation; the recommendations payload
// is built from data already on screen, not user-typed, so it's just
// forwarded as-is (api/_lib/resultsSchema.ts is the real validation for
// that part, server-side).
export const SendResultsInputSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
});
export type SendResultsInput = z.infer<typeof SendResultsInputSchema>;
