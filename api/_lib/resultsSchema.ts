import { z } from "zod";

/**
 * Server-only: request validation for api/send-results.ts. Lives under
 * api/_lib (not src/lib) for the same reason api/_lib/schema.ts and
 * api/_lib/schemas.ts do — see CLAUDE.md "Server code boundary."
 *
 * Deliberately does NOT reuse api/_lib/schema.ts's full `ProductSchema` —
 * the email only ever displays name/brand/price/buyLink plus a match line,
 * so the wire payload is a display-shaped projection of a product, not the
 * full catalog record (no hairTypes/porosity/density/etc., which the email
 * never uses). The match line itself ("✓ your porosity · ✗ not Black-owned")
 * is a plain string computed client-side by ScanResults.tsx, reusing the
 * exact same buildMatchChecklist()/formatChecklistLabel() logic already
 * rendering the on-screen checklist — this endpoint never recomputes or
 * re-derives a match verdict itself. That's deliberate: DECISIONS.md
 * already flags this codebase's real risk of accumulating parallel
 * "translate scoring into English" implementations (ScanResults.tsx's
 * humanizeMatchReason vs. buildMatchChecklist); duplicating a THIRD one
 * here, server-side, would be the same mistake again. The server's only
 * job is to render whatever match line it's given — a guarantee that the
 * email can never show a different verdict than what the user saw on
 * screen, since it's the literal same computed string, not a re-derivation.
 */

const ResultsProductSchema = z.object({
  name: z.string().min(1),
  brand: z.string().min(1),
  price: z.number().nullable(),
  buyLink: z.string().optional(),
  /** Precomputed on the client, e.g. "✓ your porosity · ✗ not Black-owned". Empty string when no answers were available to compare against. */
  matchLine: z.string(),
});

const ResultsCategorySchema = z.object({
  category: z.string().min(1),
  relaxed: z.boolean(),
  relaxedConstraints: z.array(z.enum(["density", "curlType", "porosity"])),
  picks: z.array(ResultsProductSchema),
});

/**
 * A style has no brand/price/buyLink (see scoring.ts's "Styles" section —
 * it's a technique, not a purchased product), so this is a smaller
 * projection than ResultsProductSchema, not a variant of it. `notes` is
 * the style's "Keep in mind" free-text field, shown on the results page
 * only when present — same optionality here.
 */
const ResultsStyleSchema = z.object({
  name: z.string().min(1),
  /** Precomputed on the client, same convention as a product's matchLine. */
  matchLine: z.string(),
  notes: z.string().optional(),
});

export const SendResultsRequestSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  /** The user's own curl type / porosity answers — for the Results tracking sheet's columns, not per-product display. */
  curlType: z.string(),
  porosity: z.string(),
  recommendations: z.object({
    categories: z.array(ResultsCategorySchema).min(1),
    /** Optional for backward compatibility with any in-flight client build that predates styles being sent. */
    styles: z.array(ResultsStyleSchema).optional(),
  }),
});
export type SendResultsRequest = z.infer<typeof SendResultsRequestSchema>;
