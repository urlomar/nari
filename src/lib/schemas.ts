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
