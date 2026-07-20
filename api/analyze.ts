// api/analyze.ts
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z4 from "zod/v4";
import { AnalyzeRequestSchema, HairAnalysisSchema, type AnalyzeRequest } from "../src/lib/schemas";

/**
 * zodOutputFormat() requires zod/v4-shaped schemas specifically, but the
 * shared HairAnalysisSchema (used everywhere else, including the actual
 * validation below) is built on the classic zod v3 namespace. This mirrors
 * the same shape purely for the structured-output wire format - the real
 * validation of Claude's response still runs through HairAnalysisSchema.
 */
const HairAnalysisOutputFormat = z4.object({
  curlPattern: z4.enum(["1A", "1B", "1C", "2A", "2B", "2C", "3A", "3B", "3C", "4A", "4B", "4C"]),
  porosity: z4.enum(["low", "medium", "high"]),
  conditionNotes: z4.string(),
  recommendations: z4
    .array(z4.object({ title: z4.string(), why: z4.string() }))
    .length(3),
});

/**
 * TODO(nari): I will write and tune this prompt myself. This is a
 * functional placeholder so the endpoint works end-to-end for now.
 */
export const ANALYSIS_SYSTEM_PROMPT = `You are a professional hair analyst for Nari, an app that gives personalized hair care guidance for curly, coily, and kinky hair.

You will be shown three photos of a person's hair: a front-facing view, a back view, and a close-up of individual strands. You will also be told their answers to three questions about the current state of their hair (whether it's in its natural state, whether product is applied, and how long since it was last washed).

Analyze the photos and:
1. Determine the curl pattern using the standard 1A-4C hair typing system, based primarily on the close-up strand photo.
2. Estimate porosity (low, medium, or high) from visual cues like shine, frizz, and how strands clump.
3. Write one or two sentences of condition notes - dryness, breakage, definition, shine.
4. Recommend exactly 3 products or practices, each with a one-sentence "why" tailored to what you observed.

Account for the reported hair state when it affects what you can see - e.g. straightened hair won't show its natural curl pattern as clearly, and heavy product can mask porosity and shine.`;

const client = new Anthropic();

async function callClaude(body: AnalyzeRequest) {
  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM_PROMPT,
    output_config: { format: zodOutputFormat(HairAnalysisOutputFormat) },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Hair state answers - natural state: ${body.answers.naturalState}, product: ${body.answers.product}, freshness: ${body.answers.freshness}`,
          },
          { type: "text", text: "Front-facing photo:" },
          {
            type: "image",
            source: { type: "base64", media_type: body.photos.front.mediaType, data: body.photos.front.base64 },
          },
          { type: "text", text: "Back of head photo:" },
          {
            type: "image",
            source: { type: "base64", media_type: body.photos.back.mediaType, data: body.photos.back.base64 },
          },
          { type: "text", text: "Close-up strand photo:" },
          {
            type: "image",
            source: { type: "base64", media_type: body.photos.strand.mediaType, data: body.photos.strand.base64 },
          },
        ],
      },
    ],
  });

  if (!response.parsed_output) {
    throw new Error("Model response did not match the expected schema.");
  }
  return response.parsed_output;
}

export default async function handler(req: any, res: any) {
  res.setHeader?.("Content-Type", "application/json");

  if (req.method !== "POST") {
    res.setHeader?.("Allow", "POST");
    res.statusCode = 405;
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body: any = req.body;
  if (!body || typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }

  const parsedBody = AnalyzeRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    res.statusCode = 400;
    res.end(JSON.stringify({ error: "Invalid request body." }));
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Analyze config error: missing ANTHROPIC_API_KEY");
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Server misconfigured." }));
    return;
  }

  let analysis;
  try {
    analysis = await callClaude(parsedBody.data);
  } catch (firstErr: any) {
    console.error("Analyze attempt 1 failed", { message: firstErr?.message ?? String(firstErr) });
    try {
      analysis = await callClaude(parsedBody.data);
    } catch (secondErr: any) {
      console.error("Analyze attempt 2 failed", { message: secondErr?.message ?? String(secondErr) });
      res.statusCode = 502;
      res.end(JSON.stringify({ error: "Analysis failed. Please try again." }));
      return;
    }
  }

  const validated = HairAnalysisSchema.safeParse(analysis);
  if (!validated.success) {
    console.error("Analyze response failed validation", { issues: validated.error.issues });
    res.statusCode = 502;
    res.end(JSON.stringify({ error: "Analysis failed. Please try again." }));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify(validated.data));
}
